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

import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

const DEBUG = false;
const DEBUG1 = false;

function zen2Han(figures){
  return figures.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
}

let no;  // 通し番号 グローバル
async function getPdfText_1( data, year, lastYear ){
  const pdf = await (await pdfjsLib.getDocument( { data } ).promise);
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
    index ++;
    if( m != null ){
      break;
    }
  }

  // 感染者の居住地を見つける
  {
    // let no;  -> グローバル変数へ
    let x_no=-1, x_city=-1, y_prev=-1; // '例目'表示位置の x 座標  y_prev は、居住地の y座標
    const x_width = 35;         // 表の幅
    const y_threshold = 13;     // 同じ枠内かを判断する指標

    // '例目'表示位置の x 座標
    while(true){
      let item = items[index];      // item は、pdf の部品
      index++;
        if( index >= items.length){
        break;
      }

      m = item.str.match(/例目/);
      if( m != null ){
        x_no = item.transform[4];
        continue;
      }

      m = item.str.match(/居住地/);
      if( m != null ){
        x_city = item.transform[4];
        y_prev = item.transform[5];   // 保健所管内が次にくるので、それを読み飛ばすため
        continue;
      }

      m = item.str.match(/\d{3,4}/);  // 通し番号か？
      if( m != null){
        if( Number(no)+1 != Number(m[0])){
          Log.error("???? serial no : " + no + "-" + m[0]);
        }
        no = m[0];
        continue;
      }
      // 座標から通し番号を得る
      let x = item.transform[4];
      let y = item.transform[5];
      if( x_city - x_width <= x && x <= x_city + x_width){
        const y_diff = Math.abs( y_prev - y);
        if( y_diff < y_threshold ){
          // この 居住地の記述は、直前の居住地の記述の付帯とみなすので、何もしない
        }else{
          city = item.str;
          if( city.match(/(保健所管内)/) != null ){
            // 何もしない
          }else{
            if( year > lastYear){
              csv.push( [ Number(no), new Date( year, mon-1, day), city] );
              // console.log( csv[csv.length - 1 ]);
            }
          }
        }
        y_prev = y;       // 居住地の付帯事項が書かれることがあるので、付帯事項を識別するために使う

        if( DEBUG1 == true){
          if( no == 257){
            let x = 1;
          }
          if( index == 255){
            let x = 1;
          }
        }

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


async function getPdfText( data, year, lastYear )
{

  const pdf = await (await pdfjsLib.getDocument( { data } ).promise);
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
    // let no;  -> グローバル変数へ
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
    
    //index = 0;                // '例目’が抜けている 592141, 592279
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
          city = m[1];
          if( year > lastYear){
            csv.push( [parseInt(no[0], 10), new Date( year, mon-1, day), city] );
          }
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
            if( city.includes('居住地') == false){    // pdf の表が2ページ目に及ぶとき、例目・居住地が先頭あり、それを書き込まないめ
                                                     // この時 no=null となっているので、エラーも出る。
              if( parseInt(no[0], 10) == 199 ){
                year = 2020;                  // 苦し紛れ 令和3年の1月1日に 12月31日の感染者の発表をしている
              }
              if( year > lastYear){
                csv.push( [parseInt(no[0], 10), new Date( year, mon-1, day), city] );
              }
            }
          }
        }
        y_prev = y;       // 居住地の付帯事項が書かれることがあるので、付帯事項を識別するために使う

        if( DEBUG1 == true){
          if( no == 257){
            let x = 1;
          }
          if( index == 255){
            let x = 1;
          }
        }

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
  //**** */ 前年以前のデータが有る場合は読み込む
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  // cache されているファイル名を読み込む
  let cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}` );
  let cachedFiles = [];
  await readCachedFileNames();
  async function readCachedFileNames(){
    for( const file of await fs.readdir(cache_dir).catch(()=>{ LOG.error('???? no cached file')})){ 
      const fp = path.join(cache_dir, `/${file}`);
      cachedFiles.push(fp);
    }
  }

  // 20210110 に pdf ファイルの形式が変わったと思われるので、20210110.mrk ファイルが無ければ、古い形式なので、
  // cache ディレクトリを全部消す。
  let markFileName = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}/20210121.mrk`);
  let num = cachedFiles.indexOf(markFileName);
  if(num !== -1){
    // markFile が有るので何もしない
  }else{
    // markFile が無いので、古いファイル形式と判断して、cache ファイルを全部消す
    for( const file of cachedFiles ){
      if( file.includes('src') == true ){
        // src は、消さない。　その他は消す。
      }else{
        await fs.unlink(file).catch(() => { LOG.error('????:2 no cached file') });
      }
    }
    cachedFiles = [];     // pdf のキャッシュファイルを全部消したので、フラッシュする
    await fs.writeFile(markFileName, 'mark file', (err)=>{
      if (err) throw err;
      LOG.error('???? can not create markFile');
    })
  }

  // ホームページのPDFファイル名を得る  .. その１
  const dom = new JSDOM( html );
  //let uri = null;
  const tags = dom.window.document.querySelectorAll( 'a' )
  for ( const tag of tags )
  {
    //console.log(tag.href);
    //console.log(tag.textContent);
    // 感染者発生ファイルを検出
    const m = tag.textContent.match( /令和(\d+)年(\d+)月(\d+)日.*?((?:\d+)例目|(?:\d+～\d+)).*?公表資料/ );
    if( m == null ){
      continue;
    }
   
    const uri = tag.href; // ホームページ上のファイル名  /file/attachment/592279.pdf
    const rrmmdd_uri = [ 2018+Number(m[1]),       // yyyy
                         ('00'+m[2]).slice(-2),   // mm
                         ('00'+m[3]).slice(-2),   // dd
                        　uri.split('/').slice(-1)];  // 592279.pdf
    const theFile = path.join( `${cache_dir}/`, rrmmdd_uri.join('-') ); // cache 上のファイル名
    await readAndSavePdfFile( theFile, uri );
  }

  async function readAndSavePdfFile( theFile, uri ){
    if( cachedFiles.includes(theFile) ){
      // theFile が cache に有る時は、何もしない。
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

      await fs.writeFile( theFile, cr.data);
        //Log.debug(theFile);
    }
  }

  // ホームページのPDFファイル名を得る  .. その2
  //const re = /<div class="heading"[\s\S]+?<span>令和(\d+)年(\d+)月(\d+)日[\s\S]+?<a href="(file\/attachment\/.+?pdf)/g;
  //const re = /<div class="heading"[\s\S]+?<span>令和(\d+)年(\d+)月(\d+)/g;
  const re = /<div class="heading"[\s\S]+?<span>(?:令和(\d+)年(\d+)月(\d+)|過去の公表資料一覧)[\s\S]+?<a href="((?:.+?)pdf)/g;
  while(true){
    const m = re.exec(html);
    if( m==null || m[1]==null ){
      break;
    }
    const uri = m[4];
    const rrmmdd_uri = [ 2018+Number(m[1]),       // yyyy
                        ('00'+m[2]).slice(-2),   // mm
                        ('00'+m[3]).slice(-2),   // dd
                        uri.split('/').slice(-1)];

    const theFile = path.join( `${cache_dir}/`, rrmmdd_uri.join('-') ); // cache 上のファイル名 
    await readAndSavePdfFile( theFile, uri );
   
  }
  // デバッグし易くするため、再度 cache されているファイル名を読み込む 
  cachedFiles = [];
  await readCachedFileNames();


  //
  // 個々のPDFファイルを１つづつパースする
  //
  //cachedFiles.sort().reverse();
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

      if( theFile.includes('588543') == true){
        let _dummy = 1;  // debug 用
      }
    }

    const _cr = await fs.readFile( theFile);
    const year = theFile.match(/\d{4}/)[0];

    // 前年以前のデータが　past に保存されている場合。
    if( year <= lastYear){
      continue;
    }
   
    const block = '2021-01-12';
    const file_date = theFile.match(/\d{4}-\d{2}-\d{2}/)[0];
    let _csv;
    if( file_date < block ){
      _csv = await getPdfText(_cr, year, lastYear);
    }else{
      _csv = await getPdfText_1(_cr, year, lastYear); // 令和3年1月13日以降は、PDFの1ページ目に　’例目’が書かれていないので、別途対応
                                            // まとめて対応すると、それまでのが動かなくなる可能性があり、その時のデバッグが大変
    }
   
    for( const info of _csv){
      const no = info[0];
      const date = info[1];
      const city = info[2];
      counter ++;
      csv.push( [ ('0000'+no).slice(-4), date, city ]);
    }
  }

  //Log.debug(counter + " " + csv.length);
  csv.sort(); // 確認しやすくするため、
  let prevNo = -1;
  if( DEBUG == true){
    for (const item of csv){
      if( prevNo == -1){
        // 何もしない
      }else{
        if( Math.abs(Number(item[0]) - Number(prevNo)) != 1 ){
          Log.debug(" ???? error serial data");
        }
      }
      prevNo = item[0];
      Log.debug( "** " + item[0] + " " + item[2] + " " + item[1]);
      if( prevNo == 230){
        let x = 1;
      }
    }
    Log.debug(csv.length);
  }

  let r_csv = [];     // デバッグ用の通し番号を除く、このファイルは、日付の古い順に並んでいるので、新しい順に並べ替える。
  //for (const item of csv){
  for (let i=csv.length-1; i>=0; i--){
      const item = csv[i];
      r_csv.push( item.splice(1,2));
  }

  // 30 例目（令和2年8月4日）までのデータは、例目（通し番号）を拾ってないので、
  // 2020.csv 30例目までのデータが、日付順に並んでいない。（問題無いと思う）

  //前の年のデータがあれば保存
  await savePastYearData( r_csv, pref_name );   // await が無いとデバッグしにくい
  //file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => r_csv.push(item));
  //console.log( r_csv.length);
  return r_csv;
}

  //
  //  分かっているバグ
  //　　　大勢に影響は無いと思われる。
  //      後で直すかもしれない。

  // 199例目のデータの、HTMLの日付（cache ファイルの日付）が令和3年1月1日で、
  // PDF 内の日付が 12月31日になっている。
  // past/2020.csv に 12月31日のは含まれるが、
  // 今年のファイルを読み込む時に、令和3年の1月1日は読み込まれる。
  // past/2020.csv ファイルが無いときは、問題無いが
  // past/2020.cxv ファイルが有る時は、199例目がダブルカウントされて、1つ多く出る。

  // 同じ問題に起因するのだが、ファイルの日付と感染日がずれているので、日付にずれが生じている場合がある。

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
