import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import { LOGLEVEL } from "./config.mjs";
import {axios_instance} from "./util.mjs";

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['西伯郡', '伯耆町'],  ['西部地区', '境港市']
];

function getOnePatientProcess( hText ){
  let no, mon, day, city;
  no = hText[0].match(/(\d+?)(<\/a>|$)/)[1];
/*  let mm = hText[2].match(/(\d+)\/(\d+)/);
  mon = mm[1];
  day = mm[2];
*/
  hText[2].match(/(\d+?)\/(\d+?)$/).map( function( value, index, array ){
    if( index == 1){
      mon = value;
    }else if( index == 2){
     day = value;
    }
  });
  city = hText[3].match(/<td>(.+?)$/)[1];
  if( no == 108 ){
    let x =1;
  }
  return [no, mon, day, city];
}

let firstFlag = true;
const csv = [];         // 再帰するから、関数の外側で宣言
async function parse_html( html )
{
  // 最初のHTML のページ
  const re = new RegExp( [
    '<tr>[\\s\\S]+?',
    '(<td style=[\\s\\S]+?)<\\/tr>'].join(''), 'g');                                           // <tr> - <\tr>

  while ( true )
  {
    const m = re.exec( html );
    if ( !m  ){
      if( firstFlag == true){
        firstFlag = false;
        break;
      }else{
        return;
      }
    }

    const hText = m[1].replace(/(?:\r|\n|\s{2,})/g, '').split('</td>');

    if( hText.length >= 7 && hText[0].match(/\d+(<\/a>|$)/) ){
      csv.push(getOnePatientProcess(hText));
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
  let today = new Date();
  let year = today.getFullYear();
  let prevMon = today.getMonth() + 1;
  let r_csv = [];
  let firstFlag1 = true;
  let prevNo;

  for ( let i=0; i<csv.length; i++){
    let no = csv[i][0];
    let mon = csv[i][1];
    let day = csv[i][2];
    let city = csv[i][3];

    // data lost のチェック
    if( firstFlag1 == true){
      firstFlag1 = false;
    }else{
      if( prevNo - 1 != no){
        Log.debug("???? data lost : " + prevNo + " -> " + no );
      }
    } 
    prevNo = no;

    // 年を求める
    if( Number(prevMon) < Number(mon) ){
      year --;
    }
    prevMon = mon;

    Log.debug( no + " : " + mon + "-" + day + "  " + city );
    city = city.replace(/(?:[<\(].+?$)/, ''); //function(match){ Log.debug(match); }); 
    r_csv.push( [new Date( year, mon-1, day), city])
  }

  return r_csv;
}


export default class PoiTottori extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '鳥取県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.TOTTORI_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
