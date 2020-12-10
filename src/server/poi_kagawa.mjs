import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import encoding from 'encoding-japanese';
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['善通寺', '善通寺市']
];
function filter_city( city )
{
  const m = city.match( /帰省先[：:](.+?)[）)\s]/ );
  return m ? m[ 1 ] : city;
}
async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] );
}
async function parse_html( html_ )
{
  const nextSearch = function (hText, index){
    while( true ){
      str = hText[++index];
      if( str.includes('<div class="inlineC">&nbsp;</div>')){
        continue;
      }else if( str.includes('<div class=') ){ 
        return index;
      }else{
        continue;
      }
    }
  }

  const csv = [];
  const re = new RegExp([
    '<tr>(?:[\\s\\S]+?)(?:<th|<td)',
    '([\\s\\S]+?)<\\/tr>'].join(''), 'g');          // <tr> - </tr>  join は、RegExp()　の括弧の中を1つの文字列にする

  const detected = encoding.detect(html_.data);  // 文字コード検出
//  const _hText = encoding.convert( html.data, {
//     from:detected,
//     to:'UNICODE',
//     type: 'string' });
  const html = iconv.decode( html_.data, detected ) 
  let entryFlag = false;

  var no, mon, day, age, sec, city;
  var p_no=0;
  var rowspan_date=0;
  SEARCH_BLOCK: while(true){
    const m = re.exec(html);
    if( !m )
      break;

    // データのエントリーを探す
    if( entryFlag == false){
      //console.log(hText[index]);
      if( m[0].includes('確認日') && m[0].includes('年齢') ){
        entryFlag = true;
      }
      continue;
    }

    const m_1 = m[1].replace(/[\r\n|\r|\n|\t]/g,'')  // 見やすくするために改行とtab を削除
    const hText = m_1.split("</td>");             // <td> - </td> ブロック
     
    var index = 0;
    //---- 通し番号
    var mm = hText[index].match(/>(\d+)/);
    if( mm != null ){
      no = mm[1];
    }else{
      Log.error("???? get no error : " + hText[index]);
    }
    index ++;
    
    //---- get date
    mm = hText[index].match(/rowspan="(\d+)/);
    if( mm != null){
      rowspan_date = mm[1];
      mm = hText[index].match(/(\d+)月(\d+)日/);
      if( mm != null){
        mon = mm[1];
        day = mm[2];
      }else{
        Log.error("???? get date error 0 : " + hText[index]);
      }
      index ++;
    }else if( rowspan_date <= 1){
      mm = hText[index].match(/(\d+)月(\d+)日/);
      if( mm != null){
        mon = mm[1];
        day = mm[2];
      }else{
        Log.error("???? get date error 1 : " + hText[index]);
      }
      index ++;
    }else{
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
      Log.error("???? get city error : " + hText[index]);
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

    csv.push( [ new Date( 2020, mon-1, day), filter_city( city[ 1 ] ) ] );
    //console.log(no[ 1 ], "....", mon, "月", day, "日　", city[ 1 ] );
  
    if( no == 1){
      break;
    }
  }
 
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
      cb_parse_csv: cr => parse_html( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

