import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

async function parse_html( html )
{
  const csv = [];
  const re = new RegExp( [
    '<tr><td (style=|noWrap=).*?>(&nbsp;\\d+月 *\\d+日.*?日.|<p align=\\"center\\">\\d+月 *\\d+日.*?日.', // 日付
    '|\\d+月 *\\d+日.*?日.|<p style=\\"text-align: center;\\">\\d+月 *\\d+日.*?日.',
    '|<p style=\\"margin: 0px; text-align: center;\\">\\d+月 *\\d+日.*?日.|&nbsp;|〃).*?>', //], 'g');
    '<td (style=|noWrap=).*?><.*?>(\\d+).*?<\\/td>', //].join(''),'g');                                   // 通し番号
    '<td (style=|noWrap=).*?><.*?>(&nbsp;|)(\\d+)(歳代|歳未満).*?<\\/td>', //].join(''),'g');             // 歳
    '<td (style=|noWrap=).*?><.*?>([男女]性).*?<\\/td>', //].join(''),'g');                               // 男女
    '<td (style=|noWrap=).*?><.*?>(.+?)<\\/p><\\/td>', //].join(''),'g');                                 // city
    '.*?<td (style=|noWrap=).*?<\\/td><\\/tr>'].join(''), 'g');                                           // <tr> - <\tr>

  var mon, day;
  var no = 0;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    if( no == 0 ){
        no = m[ 4 ];
    }else{
      if( no-1 != m[ 4 ]){
          //console.log( "error " + no + " " + m[4]) ;
          // HTML ファイルに患者番号の不連続がある
          // 147 138 146 
          // 139 137 
      }
        no = m[ 4 ];
    }
//    console.log(no + " " + m[2] + " .. " +  m[7] + "歳 .. " + m[10] + " .. " + m[12]);
    
    if( no == 228){
      let x = 1;
    }

    if( m[ 2 ] != '〃' && m[ 2 ] !=  '&nbsp;' ){
      const dm = m[ 2 ].match( /(\d+)月 *(\d+)日/ );
      if( dm == null ){
        console.log("can't get date : " + m[2]);
      }else{
        mon = dm[1];
        day = dm[2];
      }
    }
 
    const city = m[ 12 ].replace('&nbsp;',''); 
    csv.push( [ new Date( 2020, mon - 1, day ), city ] );
  }
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
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
