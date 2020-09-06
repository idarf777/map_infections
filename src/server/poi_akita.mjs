import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['由利本荘保健所管内', '由利本荘市'],
  ['横手保健所管内', '横手市'],
  ['大館保健所管内', '大館市'],
  ['大仙保健所管内', '大仙市'],
  ['湯沢保健所管内', '湯沢市'],
  ['能代保健所管内', '能代市'],
  ['秋田中央保健所管内', '秋田市'],
];
async function parse_html( html )
{
  const csv = [];
  const rootm = html.match( /概要[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    return csv;
  const rows = rootm[ 1 ];
  //                                何例目                           日付                         年齢                        性別                            居住地
  const re = /<tr.*?>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    const mr = m.map( (v,i) => (i > 0) && v.replace( /&.+?;/g, '' ).trim() );
    const dm = mr[ 2 ].match( /((\d+)年)?(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    let year = dm[ 2 ] ? parseInt( dm[ 2 ] ) : new Date().getFullYear();
    if ( year < 2000 )
      year += 2018; // 令和
    const am = mr[ 3 ].match( /[:：]([^)）]+)/ );
    const city = am ? am[ 1 ] : mr[ 3 ];
    csv.push( [ new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) ), city ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
export default class PoiAkita extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '秋田県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.AKITA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
