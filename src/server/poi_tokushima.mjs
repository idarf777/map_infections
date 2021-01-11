import iconv from "iconv-lite";
import jsdom from 'jsdom';
import pdfjsLib from 'pdfjs-dist/es5/build/pdf.js';
import BasePoi from "./base_poi.mjs";
import Log from './logger.mjs';
import { promises as fs } from "fs";
import path from "path";
import { LOGLEVEL } from "./config.mjs";
import {axios_instance} from "./util.mjs";

const config = global.covid19map.config;
const { JSDOM } = jsdom;

const DEBUG = false;
const DEBUG1 = false;
async function getPdfText( data, year )
{
  function zen2Han(figures){
    return figures.replace(/[０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
  }

  const pdf = await (await pdfjsLib.getDocument( { data } ).promise);
  let firstPage =true;
  let pageStyle = "old";
  const items = (await Promise.all( Array.from( { length: pdf.numPages }, async ( v, i ) =>
    (await (await pdf.getPage( i+1 )).getTextContent()).items ) )).flatMap( v => v );
  //return all_items;
//}

  let index = 0;
  let mon, day, city;
  let m, m1, m2;
  const csv = [];

  m = items[index].str.match(/追加情報/);
  if( m != null){
    return csv;
  }

  while(true){
    // get date
    m = items[index].str.match(/[(（](\d+?|\D+?)月(\d+?|\D+?)日[）)]/);
    index ++;
    if( m == null){
      continue;
    }
    mon = zen2Han(m[1]);
    day = zen2Han(m[2]);
    break;
  }

  while(true){
    // PDF の書式の違いの判定
    m = items[index].str.match(/陽性が判明した方の概要/);
    m1 = items[index].str.match(/１ 概要/);
    m2 = items[index].str.match(/１ 感染者の概要/);
    index ++;
    if( m != null ){
      pageStyle = "new";    // PDF で表を使っている書き方
      break;
    }else if( m1 != null ){
      pageStyle = "old";
      break;
    }else if( m2 != null ){
      pageStyle = "old";
      break;
    }
  }
  //console.log(pageStyle);

  // 感染者の居住地を見つける
  if( pageStyle == "old"  ){
    // 古い書式　資料20-1 29,30 例目の発生より古い物
    while(true){
      // get city
      m = items[index].str.match(/居住地：(.+?)$/);
      index ++;
      if( index >= items.length){
        break;
      }
      if( m == null){
        continue;
      }
      city = m[1];
      csv.push( [ 0, new Date( year, mon-1, day), city] );
    }
  }else{
    let no;
    let x_no, x_city;
    // '例目'表示位置の x 座標
    while(true){
      let item = items[index];
      index++;
      if( index >= items.length){
        break;
      }

      m = item.str.match(/例目/);
      if( m != null ){
        x_no = item.transform[4];
        break;
      }
    }

    // '居住地'表示位置の x 座標
    let y_prev = 0;                 // 以前の表示位置の y 座標
    while(true){
      let item = items[index];
      index++;
      if( index >= items.length){
        break;
      }

      m = item.str.match(/居住地/);
      if( m != null ){
        x_city = item.transform[4];
        y_prev = item.transform[5];   // 保健所管内が次にくるので、それを読み飛ばすため
        break;
      }
    }
    
    const x_width = 35;         // 表の幅
    const y_threshold = 13;     // 同じ枠内かを判断する指標
    LOOP: while(true){
      let item = items[index];
      index ++;

      if( index >= items.length){
        // Log.debug( no.length + " " + csv.length );
        break;
      }

      let x = item.transform[4];
      let y = item.transform[5];
      if(  x_no - x_width <= x && x <= x_no + x_width ){
        no =  item.str.match(/\d+/);
        m = item.str.match(/(?:女性|男性|女|男)[\s\S]+?(徳島|阿南)/);
        if( m != null ){
          // 苦し紛れ：この記述が発生するのは1回だけ。
          city = m[2];
          csv.push( [parseInt(no[0], 10), new Date( year, mon-1, day), city] );
        }
        // console.log(item.str);
      }else if( x_city - x_width <= x && x <= x_city + x_width){
        const y_diff = Math.abs( y_prev - y);
        if( y_diff < y_threshold ){
          // この 居住地の記述は、直前の居住地の記述の付帯とみなすので、何もしない
        }else{
          city = item.str;
          if( city.match(/(保健所管内)/) != null ){
            // 何もしない
          }else{
            if( parseInt(no[0], 10) == 199 ){
              year = 2020;                  // 苦し紛れ 令和3年の1月1日に 12月31日の感染者の発表をしている
            }
            csv.push( [parseInt(no[0], 10), new Date( year, mon-1, day), city] );
            // console.log( csv[csv.length - 1 ]);
          }
        }
        y_prev = y;       // 居住地の付帯事項が書かれることがあるので、付帯事項を識別するために使う
      }
    }
  }
  if( DEBUG1 == true){
    for( const item of csv){
      Log.debug( item[0] + " " + item[2] + " " + item[1]);
    }
  }
  return csv;
}


async function parse_html( html, pref_name )
{
  // cache されているファイル名を読み込む
  let cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}` );
  let cachedFiles = [];
  for( const file of await fs.readdir(cache_dir).catch(()=>{ LOG.error('???? no cached file')})){ 
    const fp = path.join(cache_dir, `/${file}`);
    cachedFiles.push(fp);
  }
  let markFileName = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}/20210110.mrk`);
  let num = cachedFiles.indexOf(markFileName);
  if(num !== -1){
    // 何もしない
  }else{
    for( const file of cachedFiles ){
      if( file.match(/pdf/)){
        await fs.unlink(file).catch(() => { LOG.error('????:2 no cached file') });
      }
    }
    await fs.writeFile(markFileName, 'mark file', (err)=>{
      if (err) throw err;
      LOG.error('???? can not create markFile');
    })
  }

  // サーバのPDFファイル名を得る
  const dom = new JSDOM( html );
  let uri = null;
  let pdfFileCounter = 0;
  let year = {};
  const tags = dom.window.document.querySelectorAll( 'a' )
  for ( const tag of tags )
  {
    //console.log(tag.href);
    //console.log(tag.textContent);
    // 感染者発生ファイルを検出
    const m = tag.textContent.match( /令和(\d+)年[\s\S]+?公表資料/ );
    if( m == null ){
      continue;
    }
    {
      uri = tag.href;
      pdfFileCounter ++;
      const theFile = path.join( `${cache_dir}/`, uri.split('/').slice(-1)[0] );
      year[theFile] = 2018 + parseInt(m[1],10);
      if( cachedFiles.includes(theFile) ){
        // theFile が cache に有る時は、何もしない。
        continue;
      }else{
        //ファイルを読んで、cache にセーブ
        if ( !uri.match( /^https?:\/\// ) )
        {
          const host = config.TOKUSHIMA_PDF.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
          uri = `${host}${uri}`;
        }
        Log.info( `${pref_name} : receiving ${uri}` );
        const cr = await axios_instance(
          { responseType: 'arraybuffer', 
            headers:{
              Referer: config.TOKUSHIMA_PDF.INDEX_URI
            }
          } ).get( uri );

        pdfFileCounter ++;
        await fs.writeFile( theFile, cr.data);
        //Log.debug(theFile);
      }
    }
  }
  //Log.debug("number of files are " + pdfFileCounter);
  // デバッグし易くするため、再度 cache されているファイル名を読み込む 
  cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}` );
  cachedFiles = [];
  for( const file of await fs.readdir(cache_dir).catch(()=>{ Log.error('???? no cached file')})){
    const fp = path.join(cache_dir, `/${file}`);
    cachedFiles.push(fp);
  }

  // デバッグ用
  //cachedFiles = [];
  //const fp = path.join(cache_dir, '/571703.pdf');   // 51  20代 男   自営業
  //const fp = path.join(cache_dir, '/571829.pdf');   //"57  30代 女  物産店店員   徳島",
  //cachedFiles.push(fp);


  const csv = [];
  let counter = 0;
  for( const theFile of cachedFiles ){
    //Log.debug("* " + theFile);
    if(  theFile.match(/.pdf/i) == null ){    // i は大文字と小文字の区別をしない
      //Log.debug("** match");
      continue; // continue と同じ働き
    }
    if( DEBUG == true){
      console.log(theFile);

      if( theFile.match(588543)){
        let _dummy = 1;  // debug 用
      }
    }

    const _cr = await fs.readFile( theFile);
    const _csv = await getPdfText(_cr, year[theFile]);

    for( const info of _csv){
      const no = info[0];
      const day = info[1];
      const city = info[2];
      counter ++;
      csv.push( [ no, day, city ]);
    }
  }
  //Log.debug(counter + " " + csv.length);
  csv.sort(); // 確認しやすくするため、ただし文字列で sort されているようだ。??

  if( DEBUG == true){
    let i = 0;
    for (const item of csv){
      console.log( "** " + i + " - " + item[0] + " " + item[2] + " " + item[1]);
      i++;
    }
    console.log(csv.length);
  }

  let r_csv = [];     // デバッグ用の通し番号を除く
  for (const item of csv){
    r_csv.push( item.splice(1,2));
  }
  //console.log( r_csv.length);
  return r_csv;
}

  // csv_cache を cache に書き込む
  // const csv_cache_data = JSON.stringify( csv_cache );
  // await fs.writeFile(csv_cash_file, csv_cache_data);

const ALTER_CITY_NAMES = [
  ['徳島', '徳島市'],
  ['阿南', '阿南市'],
  ['美馬', '美馬市'],
  ['吉野川', '吉野川市'],
  ['美波', '美波町'],
  
  ['徳島保健所管内', '徳島市'],
  ['阿南保健所管内', '阿南市'],
];

export default class PoiTokushima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '徳島県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.TOKUSHIMA_PDF.INDEX_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ), '徳島県' ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
