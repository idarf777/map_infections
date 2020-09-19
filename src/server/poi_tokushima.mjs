import iconv from "iconv-lite";
import jsdom from 'jsdom';
import pdfjsLib from 'pdfjs-dist/es5/build/pdf.js';
import BasePoi from "./base_poi.mjs";
import Log from './logger.mjs';
import axios from "axios";
const config = global.covid19map.config;
const { JSDOM } = jsdom;

import { promises as fs } from "fs";
import path from "path";
import { LOGLEVEL } from "./config.mjs";


async function getPdfText( data )
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
      pageStyle = "new";
      break;
    }else if( m1 != null ){
      pageStyle = "old";
      break;
    }else if( m2 != null ){
      pageStyle = "old";
      break;
    }
  }

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
      csv.push( [new Date( 2020, mon-1, day), city] );
    }
  }else{
    LOOP: while(true){
      //m = items[index].str.match(/(\d+?) +?(\d+?)(代|未満) +?(女性|男性) +?(.+?)($| )/);
      m = items[index].str.match(/例目 +年代 +性別/);
      m1 = items[index].str.match(/例目 +年代 +性別 +職業/);
      m2 = items[index].str.match(/居住地/);
      index ++;
      if( index >= items.length){
        break;
      }
      if( m == null && m1 == null　&&  m2 == null){
        continue;
      }
      if( m1 == null & m !=null ){
        // PDF の表の形式 例目/年代/性別/居住地
        while(true){
          m = items[index].str.match(/(\d+?) +?(\d+?)(代|未満) +?(女性|男性) +?(.+?)($| )/);
          index ++;
          if( index >= items.length){
            break LOOP;
          }
          if( m == null && m1 == null){
            continue;
          }
          city = m[5];
          csv.push( [new Date( 2020, mon-1, day), city] );
        }
      }
      if( m1 != null || m2 != null){
        // PDF の表の形式 例目/年代/性別/職業/居住地
        let x ;
        let x_width = 35;
        while(true){
          // 居住地が書かれている x 座標を得る。
          m1 = items[index].str.match(/保健所管内/);  // こちらが居住地より後に出る。
          index ++;
          if( index >= items.length){
            break LOOP;
          }
          if( m1 == null ){
            continue;
          }
          x = items[index-1].transform[4];
          break;
        }

        while(true){
          m1 = items[index];
          m2 = items[index].str.match(/\d+? +?\d+?代 +(男|女)( +)(.+?)( +)(.+?)$/); 
            // 571829.pdf 用 57  30代 女  物産店店員   徳島" にマッチさせるために作った物が
              // /571703.pdf   51  20代 男   自営業", にマッチしてしまう。
          index ++;
          if( index >= items.length){
            break LOOP;
          }
          if( x-x_width <= m1.transform[4]  &&  m1.transform[4] <= x+x_width){
            // 居住地の座標なら居住地
            city = m1.str;
            csv.push( [new Date( 2020, mon-1, day), city] );
            continue;
          }
          if( m2 != null){
            // 一つの枠に4つ入っていることもある。
            city = m2[5];
            if( city.match("自営業") != null){    //　苦し紛れ
              continue;
            }
            if( city.match("公務員") != null ){
              continue;
            }
            csv.push( [new Date( 2020, mon-1, day), city] );
          }
        }
      }
    }
  }

/*  for( const item of csv){
    Log.debug( item[1] + " " + item[0]);
  }
  Log.debug( csv.length );
*/
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

  // サーバのPDFファイル名を得る
  const dom = new JSDOM( html );
  let uri = null;
  let pdfFileCounter = 0;
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    // 感染者発生ファイルを検出
    const m = tag.textContent.match( /資料.+?[(（]((\d+|\D+)例目の?発生)[)）]/ );
    const m1 = tag.textContent.match( /資料.+?[(（]((\d+|\D+)(,|、)(\d+|\D+)例目の発生)[)）]/ );
    const m2 = tag.textContent.match( /資料.+?[(（]((\d+|\D+)(-|ー|～|‐)(\d+|\D+)(例目の発生|例目発生 ))[)）]/ );
    if( m == null && m1 == null && m2 == null){
      continue;
    }
    /*
    if( m != null)
      Log.debug(m[0]);
    if( m1 != null)
      Log.debug(m1[0]);
    if( m2 != null)
      Log.debug(m2[0]);
    */

    //if ( tag.textContent.match( /資料.+?[(（]((\d+|\D+)例目の発生)[)）]/ ) )
    {
      uri = tag.href;
      pdfFileCounter ++;
      const theFile = path.join( `${cache_dir}/`, uri.split('/').slice(-1)[0] );
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
        const cr = await axios.create( 
          { responseType: 'arraybuffer', 
            timeout: config.HTTP_GET_TIMEOUT, 
            headers:{
              Referer: config.TOKUSHIMA_PDF.INDEX_URI
            }
          } ).get( uri, { 'axios-retry': { retries: config.HTTP_RETRY } } );

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
  for( const file of await fs.readdir(cache_dir).catch(()=>{ LOG.error('???? no cached file')})){ 
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
    if(  theFile.match(/.(pdf|PDF)/) == null ){
      //Log.debug("** match");
      continue; // continue と同じ働き
    }
    const _cr = await fs.readFile( theFile);
    const _csv = await getPdfText(_cr);
    for( const info of _csv){
      const day = info[0];
      const city = info[1];
      counter ++;
      csv.push( [ day, city ]);
    }
  }

  //Log.debug(counter + " " + csv.length);
  csv.forEach( c => c[ 1 ] = c[ 1 ].replace( /[(（].+?[)）]/g, '' ) );
  return csv;
}
  // csv_cache を cache に書き込む
  // const csv_cache_data = JSON.stringify( csv_cache );
  // await fs.writeFile(csv_cash_file, csv_cache_data);

const ALTER_CITY_NAMES = [
  ['徳島', '徳島市'],
  ['阿南', '阿南市'],
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
