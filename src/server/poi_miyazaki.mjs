import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

async function parse_html( html )
{
  const csv = [];
  const re = new RegExp( [
    '<tr>',
    '[\\s\\S]+?<td>(\\d+)<\\/td>',       //].join(''),'g');       // No
    '[\\s\\S]+?<td>(\\d+月\\d+日)<\\/td>',  // date
    '[\\s\\S]+?<td>[\\s\\S]+?<\\/td>',              // 年代
    '[\\s\\S]+?<td>[\\s\\S]+?<\\/td>',              // 性別

    '[\\s\\S]+?<td',
    '( nowrap=\\"nowrap\\">(.+?)<br \\/>[\\s\\S]+?|',                        // 188
    '>[\\r\\n|\\r|\\n] {12}<p>(.+?)<\\/p><p>[\\s\\S]+?<\\/p>[\\s\\S]+?|',
    '>[\\r\\n|\\r|\\n] {12}<p>(.+?)<br *\\/>[\\s\\S]+?<\\/p>[\\s\\S]+?|',    // 189
    '>[\\r\\n|\\r|\\n] {12}<p>(.+?)<\\/p>[\\s\\S]+?|',
    '>(.+?)[\\r\\n|\\r|\\n] {12}<p>[\\s\\S]+?|',
    '>(.+?)<br *\\/>[\\s\\S]+?|',
    '>(.+?))',
    '<\\/td>',            // 居住地

    '[\\s\\S]+?<\\/tr>+?'].join(''), 'g');  // <tr> - <\tr>

  var mon, day;
  var no = 0;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    if( no == 0 ){
        no = m[ 1 ];
    }else{
      if( no-1 != m[ 1 ]){
          //console.log( "error " + no + " " + m[4]) ;
          // HTML ファイルに患者番号の不連続がある
          // 147 138 146 
          // 139 137 
      }
        no = m[ 1 ];
    }
  //  if( no == 188){
  //    const x = 1;
  //  }
    
    const dm = m[ 2 ].match(/(\d+)月 *(\d+)日/ );
    if( dm == null ){
      console.log("can't get date : " + m[2]);
      continue;
    }else{
      mon = dm[1];
      day = dm[2];
    }
    
    const _m = m.slice(4, 11);
    var city = _m.filter( v => v);

/*    if( m[4] != undefined ){
      city = m[4];
    }else if( m[5] != undefined ){
      city = m[5];
    }else if( m[6] != undefined ){
      city = m[6];
    }else if( m[7] != undefined ){
      city = m[7];
    }else if( m[8] != undefined ){
      city = m[8];
    }else if( m[9] != undefined ){
      city = m[9];
    }else{
      city = m[10];
    }
*/
    //console.log(no + " " + m[ 2 ] + " " + city);

    csv.push( [ new Date( 2020, mon - 1, day ), city[0] ] );
  }
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
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
