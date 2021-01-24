import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import encoding from 'encoding-japanese';
import { promises as fs } from "fs";
import fsx from "fs";
import path from "path";
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['善通寺', '善通寺市']
];

import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

async function parse_html( html_, pref_name )
{

  // 前年以前のデータが有る場合は読み込む
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  // データをパースする
  const today = new Date();
  let year = today.getFullYear();
  let prevMon = today.getMonth() + 1;

  const csv = [];
  const re = new RegExp([
    '<tr>[\\s\\S]+?',
    '(<td>[\\s\\S]+?)<\\/tr>'].join(''), 'g');          // <tr> - </tr>  join は、RegExp()　の括弧の中を1つの文字列にする

  const detected = encoding.detect(html_.data);  // 文字コード検出
//  const _hText = encoding.convert( html.data, {
//     from:detected,
//     to:'UNICODE',
//     type: 'string' });
  const html = iconv.decode( html_.data, detected ) 
  let no, p_no=0;
  let mon, day, city;
  let rowspan_date=0;

  PARSE_BLOCK: while(true){
    const m = re.exec(html);
    if( !m )
      break;

    const m_1 = m[1].replace(/(?:\r|\n|\s{2,})/g,'')  // 見やすくするために改行とtab を削除
    const hText = m_1.split("</td>");                 // <td> - </td> ブロック
     
    let index = 0;
    //---- 通し番号
    var mm = hText[index].match(/>(\d+)/);
    if( mm != null ){
      no = mm[1];
    }else{
      Log.error("???? get no error : " + hText[index]);
    }
    index ++;
    
    //---- get date
    mm = hText[index].match(/(\d+)月(\d+)日/);
    if( mm != null){
      mon = mm[1];
      day = mm[2];
      mm = hText[index].match(/rowspan="(\d+)/);
      index ++;
      if( mm != null ){
        rowspan_date = mm[1];
      }
    }else{
      if( rowspan_date <= 1){
        Log.error("???? get date error " + no + " : " + hText[index] );
      }
      rowspan_date --;
    }

    //---- age
    index ++;
    //---- sex
    index ++;
    //---- city
  
    mm = hText[index].match(/>(.+?)$/);
    if( mm != null){
      city = mm[1].replace(/<p[\s\S]+?>/,'').replace(/<\/p>/,'').replace(/&nbsp;/g,'');
    }else{
      Log.error("???? get city error : " + no + " " + hText[index]);
    }
    if( p_no == 0){
      p_no = no;
    }else if( p_no - 1 != no){
      Log.error( "???? serial error " + no + " " + p_no) ;
    }else{
      p_no = no;
    }
    if( no == 119){
      let x = 1;
    }
    //console.log(no + " " + mon + " " + day + " " + city);

    // 前の年になった
    if( Number(prevMon) < Number(mon)){
      year --;
    }
    prevMon = mon;

    // 保存されている年のデータがあるなら、終わり。
    if( year <= lastYear){
      break;
    }
    csv.push( [ new Date( year, mon-1, day), city ] );
  
    if( no == 1){
      break;
    }
  }


  //前の年のデータがあれば保存
  await savePastYearData( csv, pref_name );   // await が無いとデバッグしにくい
  // file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => csv.push(item));

  return csv;
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '香川県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KAGAWA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( cr, '香川県' ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

