import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['', '']
];

async function parse_html( html )
{
  const csv = [];
  const re = new RegExp( [
    '<tr>[\\r\\n|\\r|\\n]<td',
    '([\\s\\S]+?)<\\/tr>'].join(''), 'g');                                           // <tr> - <\tr>

  var mon, day, city;
  var no, to_no;
  var p_no=0;
 
  SEARCH_BLOCK: while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const hText = m[1].split(/[\r\n|\r|\n]/);

    var index=0;
    var mm, mm_1;
    while(true){
      // 通し番号を探す
      mm = hText[index].match(/.+?>(\d+)/);
      mm_1 = hText[index].match(/.+?>(\d+)～(\d+)/);
      index++;
      if( mm_1 != null){
        no = mm_1[2];
        to_no = mm_1[1]
        break;
      }else if( mm != null){
        to_no = no = mm[1];
        break;
      }
      if( index >= hText.length){
        continue SEARCH_BLOCK;
      }
    }

    while(true){
      // get date
      mm = hText[index].match(/.+?>(\d+)(月|\/)(\d+)/);
      index++;
      if( mm != null){
        mon = mm[1];
        day = mm[3];
        break;
      }
      if( index >= hText.length){
        continue SEARCH_BLOCK;
      }
    }

    while(true){
      // get age
      mm = hText[index].match(/.+?>(\d+|非公表|成人|詳細情報のとおり)/);
      index++;
      if( mm != null){
        break;
      }
      if( index >= hText.length){
        continue SEARCH_BLOCK;
      }
    }
 
    while(true){
      // get city
      mm = hText[index].match(/.+?>(.+?)<\/td>/);
      mm_1 = hText[index].match(/<p>(.+?)</);
      index++;
      if( mm != null){
        city = mm[1];
         break;
      }else if( mm_1 != null){
        city = mm_1[1];
        break;
      }
      if( index >= hText.length){
        continue SEARCH_BLOCK;
      }
    }
    // 通し番号の抜けチェック
  if( p_no == 0 ){
      p_no = no;
  }else{
    if( p_no-1 != no){
        Log.error( "???? serial error " + no + " " + p_no) ;
    }
    p_no = to_no;
  }
  // チェック用のブレイクポイントを置くところ
  if( no == 159){
    let x = 1;
  }

  //console.log( no + ":" + mon + " " + day + " " + city);

  while(true){
    csv.push( [ new Date( 2020, mon - 1, day ), city ] );
    if( no == to_no){
      break;
    }else{
      no--;
    }
  }

  if( no == 1){
      break;
    }
  }
  return csv;
}


export default class PoiHiroshima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '広島県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.HIROSHIMA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
