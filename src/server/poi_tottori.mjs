import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import { LOGLEVEL } from "./config.mjs";
import {axios_instance} from "./util.mjs";

const config = global.covid19map.config;

import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

//
// 次にファイルを直す時は、再帰を止めた方が良い。
// ホームページを見ていると、書式が変更されそうだ。
//

const ALTER_CITY_NAMES = [
  ['西伯郡', '伯耆町'],  ['西部地区', '境港市'],  ['中部地区', '倉吉市'],  ['東部地区', '鳥取市']
];

const DEBUG = true;
let no=0;
function getOnePatientProcess( hText ){
  let mon, day, city;
  const _m = hText[0].replace( /\s/, '' ).replace( /<del>\d+<\/del>|<a>.*?<\/a>/g, '' ).match(/\d+/);
  if ( !_m )
    return null;
  const _no = Number(_m[ 0 ]);
  if (DEBUG == true ){
    if( no == 0 ){
      // 何もしない。
    }else{
      if( no -1 != _no ){
        Log.error( "???? serial no :" + no + "-" + _no );
      }
    }
  }
  no = _no;
/*  let mm = hText[2].match(/(\d+)\/(\d+)/);
  mon = mm[1];
  day = mm[2];
*/
  const m = hText[1].match(/(\d+?)\/(\d+?)$/);
  if ( !m )
    return null;
  m.map( function( value, index, array ){
    if( index == 1){
      mon = value;
    }else if( index == 2){
     day = value;
    }
  });
  city = hText[2].match(/<td>(.+?)$/)[1];
  if( no == 108 ){
    let x =1;
  }
  return [no, mon, day, city];
}

//
// 鳥取県の構成が、新しい患者のデータ -> 古い患者のデータ有るファイル -> 古い患者のデータ　となっている。
//
let firstFlag = true;   // 最初のHTMLファイルの処理か、次のHTMLのファイルの処理かを判断
let csv = [];         // 再帰するから、関数の外側で宣言

async function parse_html( html, pref_name )
{
  // 前年以前のデータが有る場合は読み込む
  // 再帰しているので、複数実行されるが、結果に影響を与えないので無視
  //slet { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  // 最初のHTML のページ
  const re = new RegExp( /<tr>[\s\S]*?(<td[\s\S]*?>[\s\S]*?)<\/tr>/g )

  while ( true )
  {
    const m = re.exec( html );
    if ( !m  ){
      if( firstFlag ){       // 最初のHTMLファイルの時は、次のHTMLファイルを処理するルーチンに進む
        firstFlag = false;      
        break;
      }else{                        // 2つ目のHTMLファイルを処理した後は、リターンする
        return;
      }
    }

    const hText = m[1].replace(/(?:\r|\n|\s{2,})/g, '').split('</td>');

    if( hText.length >= 5 ){
      const p = getOnePatientProcess(hText);
      if ( p )
        csv.push( p );
    }
  }

  // 過去の一覧のHTMLのページ
  const re1 = new RegExp( [
    '<a href="(.+?)">',
    '過去の一覧<\\/a>'].join(''), 'g');

  while ( true )
  {
    const m = re1.exec(html);
    if( m == null ){
      continue;
    }
    
    let uri = m[1];
    const host = config.TOTTORI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
    uri = `${host}${uri}`;
    
    Log.info( `receiving : ${uri}` );
    const cr = await axios_instance(
    { responseType: 'arraybuffer', 
      headers:{
        Referer: config.TOTTORI_HTML.DATA_URI
      }
    } ).get( uri );

    const html_1 = iconv.decode( cr.data, 'UTF8');
    parse_html(html_1);                               // 再帰して、患者情報を読み込む部分を使いまわす。
    break;
  }

  //
  // 全ての patient データを読み込んでからの処理
  //

  // 前年以前のデータが有る場合は読み込む
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  let today = new Date();
  let year = today.getFullYear();
  let prevMon = today.getMonth() + 1;
  let r_csv = [];                                     // parse_htmlがリターンする時に、ここにデータ有り
  let prevNo;

  for ( let i=0; i<csv.length; i++){
    let no = csv[i][0];
    let mon = csv[i][1];
    let day = csv[i][2];
    let city = csv[i][3];

    // data lost のチェック
    if( i == 0 ){
      // 何もしない
    }else{
      if( prevNo - 1 != no){
        Log.debug("???? data lost : " + prevNo + " -> " + no );
      }
    } 
    prevNo = no;

    // 年を求める
    // 前年以前のデータ json/past/鳥取県に残っている場合は、r_csv.push しない
    if( Number(prevMon) < Number(mon) ){
      year --;
    }
    prevMon = mon;
    
    if( year <= lastYear){      // past file が無いときは、 lastYear = 0
      continue;
    }
    // Log.debug( no + " : " + mon + "-" + day + "  " + city );
    city = city.replace(/(?:[<\(].+?$)/, ''); //function(match){ Log.debug(match); }); 
    r_csv.push( [new Date( year, mon-1, day), city])
  }

  //前の年のデータがあれば保存
  await savePastYearData( r_csv, pref_name );   // await が無いとデバッグしにくい
  //file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => r_csv.push(item));

  return r_csv;
}


export default class PoiTottori extends BasePoi
{
  static async load()
  {
    firstFlag = true;
    no = 0;
    csv = [];
    return BasePoi.process_csv( {
        pref_name: '鳥取県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.TOTTORI_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ), '鳥取県' ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
