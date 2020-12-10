import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['安芸郡', '府中町']
];

async function parse_html( html )
{
  const csv = [];
  const re = new RegExp( [
    '<tr>[\\r\\n|\\r|\\n]<td',
    '([\\s\\S]+?)<\\/tr>'].join(''), 'g');                                           // <tr> - <\tr>

  var rowspan_no=0, rowspan_date=0, rowspan_age=0, rowspan_city=0;
  var mon, day, city;
  var no, to_no;
  var p_no=0;
 
  SEARCH_BLOCK: while ( true )
  {
    const m = re.exec( html );                    // <tr> - </tr> のブロック
    if ( !m )
      break;
    const m_1 = m[1].replace(/[\r\n|\r|\n]/g,'')  // 見やすくするために改行を削除
    const hText = m_1.split("</td>");             // <td> - </td> ブロック

    var index=0;
    var mm, mm_1;

    //---- 通し番号を探す
    mm = hText[index].match(/.+?>(\d+)/);
    mm_1 = hText[index].match(/.+?>(\d+)～(\d+)/);
    index++;
    if( mm_1 != null){
      no = mm_1[2];
      to_no = mm_1[1]
    }else if( mm != null){
       to_no = no = mm[1];
    }else{
        continue SEARCH_BLOCK;
    }

    //---- get date
    mm= hText[index].match(/.+? rowspan="(\d+)/);
    if( mm != null){
      rowspan_date = mm[1];
      mm = hText[index].match(/.+?>(\d+)(?:月|\/)(\d+)/);
      if( mm != null){
        mon = mm[1];
        day = mm[2];
      }else{
        Log.info("???? getting date error_0 : no=" + no + " index=" + index);
      }
      index++;
    }else if( rowspan_date <= 1){
      mm = hText[index].match(/.+?>(\d+)(?:月|\/)(\d+)/);
      if( mm != null){
        mon = mm[1];
        day = mm[2];
      }else{
        Log.info("???? getting date error_1 : no=" + no + " index=" + index);
      }
      index++;
    }else{
      rowspan_date --;
    }

    /*
    if(rowspan_date <= 1){
      mm= hText[index].match(/.+? rowspan="(\d+)/)
      if( mm != null){
        rowspan_date = mm[1]
      }
      mm = hText[index].match(/.+?>(\d+)(?:月|\/)(\d+)/);
      if( mm != null){
        mon = mm[1];
        day = mm[2];
      }else{
        Log.info("???? getting date error : no=" + no + " index=" + index);
      }
      index++;
    }else{
      rowspan_date-- ;
    }
    */

    //---- get age
    mm = hText[index].match(/.+?>(\d+|非公表|成人|詳細情報のとおり|児童|調査中)/);
    if( mm != null){
      index ++;
    }
 
    //---- get city
    mm= hText[index].match(/.+? rowspan="(\d+)/)
    if( mm != null){
      rowspan_city = mm[1]
      mm = hText[index].match(/.+?>(.+?)$/);
      if( mm != null){
        //city = mm[1]
        city = mm[1].replace(/<p>/, '').replace(/<\/p>/, '');  // 初めて使った .ドット構文
        if( city.includes('東京都')){
          city = '東京都';            // No 14 の特例　これが無くても結果に影響しない
        }
        if( city.includes('県外')){
          city = '県外';              // No987 の特例　これが無くても結果に影響しない
        }
      }else{
        Log.error("???? get city error : " + mm[0])
      }
      index++;
    }else if( rowspan_city <= 1){
      mm = hText[index].match(/.+?>(.+?)$/);
      if( mm != null){
        //city = mm[1];
        city = mm[1].replace(/<p>/, '').replace(/<\/p>/, '');
        if( city.includes('東京都')){
          city = '東京都';            // No 14 の特例　これが無くても結果に影響しない
        }
        if( city.includes('県外')){
          city = '県外';              // No987 の特例　これが無くても結果に影響しない
        }
      }
      index++;
    }else{
      rowspan_city --;
    }

  //---- 通し番号の抜けチェック
  if( p_no == 0 ){
      p_no = no;
  }else{
    if( p_no-1 != no){
      // 1103 は、全角で書かれているのでエラーになるが、結果に影響を与えない。
      //Log.error( "???? serial error " + no + " " + p_no) ;
    }
    p_no = to_no;
  }
  // チェック用のブレイクポイントを置くところ
  if( no == 1084){
    let x = 1;
  }

  //console.log( no + ":" + mon + " " + day + " " + city + " rowspan_city=" + rowspan_city);

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
