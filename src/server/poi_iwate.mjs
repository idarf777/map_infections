import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [];
async function parse_html( html )
{
  const csv = [];
  const rootm = html.match( /陽性者に関する情報[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    return csv;
  const rows = rootm[ 1 ];
  //                                何例目                           年齢                        性別                            居住地                        日付
  const re = /<tr.*?>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    const mr = m.map( (v,i) => (i > 0) && v.replace( /&.+?;/g, '' ).trim() );
    const dm = mr[ 3 ].match( /(\d+)年(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    const am = mr[ 2 ].match( /[:：]([^)）]+)/ );
    const city = am ? am[ 1 ] : mr[ 2 ];
    csv.push( [ new Date( parseInt( dm[ 1 ] ) + 2018, parseInt( dm[ 2 ] ) - 1, parseInt( dm[ 3 ] ) ), city ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
export default class PoiIwate extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '岩手県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.IWATE_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
