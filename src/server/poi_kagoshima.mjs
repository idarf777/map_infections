import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

async function parse_html( html )
{
  const csv = [];
  const re = new RegExp( [
    ' {12}<tr>\\r\\n',
    ' {16}<td>(\\d+)<\\/td>\\r\\n',       //].join(''),'g');       // No
    '([\\s\\S]+?)',
    ' {16}<td>(〇&nbsp;|&nbsp;|〇)<\\/td>',
    '[\\s\\S]+?<\\/tr>'].join(''), 'g');  // <tr> - <\tr>

  var mon, day, city;
  var no = 0, p_no = 0;
  while ( true )
  {
    var m = re.exec( html );
    const hText = m[2].split(/\r\n/);
    if( m[2].includes('<p align="center">ー</p>') == false){
      const date = hText[0].match(/(\d+)月(\d+)日/);
      if( date != null){
        mon = date[1];
        day = date[2];
        city = hText[1].match(/<td.*?>(.+?)<\/td>/);
      }else{
        city = hText[0].match(/<td>(.+?)<\/td>/);
      }
      no = m[1];
    }else{
        var index;
        for( index = 0; index< hText.length; ++index){
          const _no = hText[index].match(/<td>(\d+)<\/td>/);
          if( _no != null ){
            no = _no[1];
            break;
          }      
        }
        if( index >= hText.length){
          console.log("???? HTML is wrong at poi_kanagawa.mjs");
        }
        const date = hText[++index].match(/(\d+)月(\d+)日/);
        if( date != null ){
          mon = date[1];
          day = date[2];
          ++index;
        }
        city = hText[index].match(/<td>(.+?)<\/td>/);
        if( city == null ){
          console.log("???? can't find city:HTML is wrong at poi_kanagawa.mjs");
        }
    }
    if ( !m )
      break;
  
    if( p_no == 0 ){
        p_no = no;;
    }else{
      if( p_no-1 != no){
          console.log( "error " + no ) ;
      }
      p_no = no;
    }
//    if( no == 173){
//      const x = 1;
//    }
    console.log(no + " " + mon + "月" + day + "日  " + city[1]);

    csv.push( [ new Date( 2020, mon - 1, day ), city[1] ] );
    if( no <= 1){
      break;
    }
  }
  return csv;
}
export default class PoiKagoshima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '鹿児島県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.KAGOSHIMA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
