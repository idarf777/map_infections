import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import encoding from 'encoding-japanese';
const config = global.covid19map.config;

//const ALTER_CITY_NAMES = [['徳島県', ''], ['大阪市（帰省先：高松市）', '高松市'], ['岡山県', '']];
function filter_city( city )
{
  const m = city.match( /帰省先[：:](.+?)[）)\s\S]/ );
  return m ? m[ 1 ] : city;
}
async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] );
}
async function parse_html( html )
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
  const detected = encoding.detect(html.data);
//  const _hText = encoding.convert( html.data, {
//     from:detected,
//     to:'UNICODE',
//     type: 'string' });
  const _hText = iconv.decode( html.data, detected ) 
  const hText = _hText.split(/\r\n|\r|\n/);
  let entryFlag = false;
  //let no, date, age, sec, city; 
  for( let index = 0; index<hText.length; index++){
    var str = hText[index];
    if( entryFlag == false){
      //console.log(hText[index]);
      if( str.includes('確認日') && str.includes('年齢') ){
        entryFlag = true;
      }else{
        continue;
      }
    }

    str = hText[++index];
    while(true){  // <tr> 検出
     var result = str.match(/^<tr>$/);
     if(result){
       break;
     }
     str = hText[++index];
    }

    index = nextSearch(hText, index);
    str = hText[index].replace( /&nbsp;/g, "");
    var no = str.match(/^<div class=\".+?\">(\d+)/);

    index = nextSearch(hText, index);
    str = hText[index].replace( /&nbsp;/g, "");
    
    if( str.includes( '月') ){
      var result = str.match(/^<div class=\".+?\">(\d+)月(\d+)日/);
      var mon = result[ 1 ];
      var day = result[ 2 ];

      index = nextSearch(hText, index);
      str = hText[index].replace( /&nbsp;/g, "");
        }else{
      // 日にちのカラムが前のと同じ。何もしない。
    }

    var age = str.match(/^<div class=\".+?\">(\d+)代/);

    index = nextSearch(hText, index);
    str = hText[index].replace( /&nbsp;/g, "");
    var sex = str.match(/^<div class=\".+?\">(.*?)<\/div>/);

    index = nextSearch(hText, index);
    str = hText[index].replace( /&nbsp;/g, "");
    
    var city = str.match(/^<div class=\".+?\">(.*?)<\/div>/);
  
    csv.push( [ new Date( 2020, mon-1, day), filter_city( city[ 1 ] ) ] );
    //console.log(no[ 1 ], "....", mon, "月", day, "日　", city[ 1 ] );
  
    if( no[ 1 ] == 1){
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
      //alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KAGAWA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

