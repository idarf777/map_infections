import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['県南地域', 'つくば市'], ['竜ケ崎保健所管内', '龍ケ崎市'], ['筑西保健所管内', '筑西市'], ['中央保健所管内', '水戸市'], ['土浦保健所管内', '土浦市'], ['潮来保健所管内', '潮来市'], ['古河保健所管内', '古河市'], ['ひたちなか保健所管内', 'ひたちなか市']] ;
async function parse_html( html )
{
  const csv = [];
  const rootm = html.match( /新型コロナウイルス感染症陽性者一覧[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    return csv;
  const rows = rootm[ 1 ];
  const re = /<tr.*?>[\s\S]*?<td.*?>(.*?)<\/td>[\s\S]*?<td(.*?)>.*?<\/td>[\s\S]*?<td.*?>.*?<\/td>[\s\S]*?<td.*?>(.*?)<\/td>[\s\S]*?<td.*?>.*?<\/td>[\s\S]*?<\/tr>/g;
  let prev_date = null;
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    const mr = m.map( (v,i) => (i > 0) && v.replace( /&.+?;/g, '' ).trim() );
    if ( mr[ 2 ].match( /colspan/ ) )
      continue;
    const dm = mr[ 1 ].match( /((\d+)\/)?(\d+)\/(\d+)/ );
    if ( !dm )
      continue;
    const year = Number( dm[ 2 ] || new Date().getFullYear() );
    const date = new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) );
    if ( prev_date != null && prev_date.getTime() < date.getTime() )
      break;  // 年の境目を越えた
    prev_date = date;
    csv.push( [ date, mr[ 3 ] ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
export default class PoiIbaraki extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '茨城県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.IBARAKI_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
