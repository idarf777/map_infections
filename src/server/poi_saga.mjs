import BasePoi from "./base_poi.mjs";
import Log from "./logger.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

const DEBUG = false;
async function parse_html( html, pref_name )
{
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。
  const csv = [];
  const re = new RegExp([
    '<tr>(<td [\\s\\S]+?)<\\/tr>'
  ].join(''), 'g');

  let mon, day;
  let no, prevNo = 0;
  const today = new Date();
  let year = today.getFullYear();
  let prevMon = today.getMonth() + 1;

  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const hText = m[1].replace(/&nbsp|;|<\/p>|\s/g, '').split('</td>');
    
    // 日付
    let mm = hText[0].match( /(\d+)月\s*(\d+)日/ );
    if( mm == null){
      if( hText[0].match(/〃/) ){
        // 何もしない
      }else{
        continue;
      }
    }else{
      let dummy;
      [ dummy, mon, day ] = mm;
      if( Number(prevMon) < Number(mon) ){
        year--
        /*
        // 以降のデータは、前年データとしてファイルから読まれている
        if( year == lastYear){
          break;
        }
        */
      }
      prevMon = mon;
    }

    // 通し番号　チェック
    mm = hText[1].match(/>(\d+)/);
    no = mm[1];
    if( prevNo == 0){
      // 何もしない。
    }else if( prevNo-1 != no){
      Log.error("???? wrong serial number :" + no + " - ", prevNo);
    }
    prevNo = no;

    // get city
    //mm = hText[4].match(/>[\s\S]+?>(.+?)$/);
    const city = hText[4].replace(/<\S+?>/g, '')
    //const city = mm[1];
  
    // 前の年(lastYear)までのデータをファイルから読み込んである
    if( year == lastYear){
      break;
    }
    csv.push( [ new Date( year, mon - 1, day ), city ] );

    if( DEBUG == true){
      Log.debug(no + " " + year + "/" + mon + "/" + day + " " + city );
      if( no == 48){
        let x = 0;
      }
    }
    if( no == 1){
      break;
    }
  }

  //前の年のデータがあれば保存
  await savePastYearData( csv, pref_name );   // await が無いとデバッグしにくい
  //file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => csv.push(item));

  return csv;
}

export default class PoiSaga extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '佐賀県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.SAGA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ), '佐賀県' ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
