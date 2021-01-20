import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

import Log from "./logger.mjs";
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import {axios_instance} from "./util.mjs";
import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

const DEBUG = false;
async function parse_html( html, pref_name )
{
  // 前年以前のデータが有る場合は読み込む
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  // 最初の HTML ページ
  let pastHtmlUri;
  let dom = new JSDOM( html );
  for (const tag of dom.window.document.querySelectorAll('a') ){
    if( tag.textContent.includes('宮崎県における感染者状況一覧（過去公表分）')){
      const uri = tag.href;
      const host = config.MIYAZAKI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
      pastHtmlUri = `${host}${uri}`;
      break;
    }
  }
 
  // 過去分の HTML ページへのリンクが書かれているページで、過去分のページの Uri を得る
  const cr = await axios_instance(
    { responseType: 'arraybuffer', 
      headers:{
        Referer: config.MIYAZAKI_HTML.DATA_URI
      }
    } ).get( pastHtmlUri );

  const pastHtml = iconv.decode( cr.data, 'UTF8');
  dom = new JSDOM( pastHtml );
  const pastUris = [];
  for (const tag of dom.window.document.querySelectorAll('li > a') ){
    if( tag.textContent.match( /(\d+)月/ ) != null ){
      pastUris.push( tag.href );
    }
  }
  pastUris.sort();

  // それぞれのページをパースする
  let mon, day, city;
  let no, prevNo=0;
  const today = new Date();
  let cYear = today.getFullYear();
  let prevMon = today.getMonth() + 1;
  let rowspan_date, rowspan_city;
  const csv = [];
  let datePos = 2;

  function getPatient( html ){
    let trancateParseFlag = false;    // 前年のデータが存在したので、パースを止めたフラッグｓｓ
    const re = new RegExp( [
      '<tr>[\\s\\S]+?',
      '(<td[\\s\\S]+?)<\\/tr>+?'].join(''), 'g');  // <tr> - <\tr>
  
    while(true){
      const m = re.exec( html );
      if( m == null){
        break;
      }

      //const hText = m[1].replace(/<p[\s\S]+?>|<\/p>|\r|\n|\s/g,'').split('</td>');
      const hText = m[1].replace(/<\r|\n|\s/g,'').split('</td>');
      let index = 0;

      let mm = hText[index].match(/<td.*>(?:<p.*?>|)(\d+)/);
      if( mm == null){
        continue;
      }
      no = mm[1];

      if( no > 993){
        index = 2;
      }else{
        index = 1;
      }
      mm = hText[index].match(/(\d+)月(\d+)日/);
      if( mm != null ){
        mon = mm[1];
        day = mm[2];
        mm = hText[index].match(/rowspan="(\d+)/);
        index ++;
        if( mm != null){
          rowspan_date = mm[1];
        }
      }else if( rowspan_date >= 1){
        rowspan_date --;
      }else{
        Log.error("???? can't get date : " + no);
      }

      index += 2;
      //mm = hText[index].match(/<td.*>(.+)(?:<\/p>|)/);
      //mm = hText[index].match(/<td.*>(?:<p.+?>|)(.+[市町村県都府道])(?:<\/p>|)/);
      //mm = hText[index].match(/<td.*?>(?:<p.*?>|)(.+[市町村県都府道])(?:<\/p>|)/);
      mm = hText[index].match(/<td.*?>(?:<p.*?>|)(.+?[市町村県都府道])(?:<\/p>|)/);
      if( mm != null){
        city = mm[1];
        mm = hText[index].match(/rowspan="(\d+)/);
        if( mm != null){
          rowspan_city = mm[1];
        }
      }else if( rowspan_city >= 1){
        rowspan_city--;
      }else{
        Log.error("???? can't get city : " + no);
      }

      if( prevNo == 0){
        // 何もしない
      }else{
        if( prevNo - 1 != no )
        Log.error( "???? serial no error : " + prevNo + "-" + no);
      }
      prevNo = no;

      if( Number(prevMon) < Number(mon) ){
        cYear --;
        if( cYear == lastYear){
          trancateParseFlag = true;
          break;
        }
      }
      prevMon = mon;
      if( DEBUG == true){
        Log.debug( no + "  " + cYear + "/" + mon + "/" + day + "  " + city);
        if( no == 942){
          let x = 1;
        }
      }

      csv.push( [ new Date( cYear, mon-1, day), city ] );
    }
    return trancateParseFlag;
  }
  
  if( getPatient( html ) == true ){       // 最初のページのパース
    // 次のデータを読む必要はない。
  }else{
    // 過去分のページのパース
    for( let i=pastUris.length-1; i>=0; i--){
      let uri = pastUris[i];
      const host = config.MIYAZAKI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
      uri = `${host}${uri}`;
      const cr = await axios_instance(
        { responseType: 'arraybuffer', 
          headers:{
            Referer: config.MIYAZAKI_HTML.DATA_URI
          }
        } ).get( uri );
      const html = iconv.decode( cr.data, 'UTF8');  
      if( getPatient( html ) == true ){
        break;
      };
    }
  }

  //前の年のデータがあれば保存
  await savePastYearData( csv, pref_name );   // await が無いとデバッグしにくい
  //file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => csv.push(item));

  return csv;
}

export default class PoiMiyazaki extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '宮崎県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.MIYAZAKI_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ), '宮崎県' ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
