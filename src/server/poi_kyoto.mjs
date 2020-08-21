import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['管内', ''], ['府内', ''], ['京都府内', ''], ['京都市内', '京都市'], ['乙訓保健所管内', '長岡京市'], ['乙訓管内', '長岡京市'], ['山城管内', '宇治市'], ['丹後管内', '京丹後市'], ['南丹管内', '亀岡市'], ['中丹管内', '福知山市']];
async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] );
}
async function parse_html( html )
{
  const csv = [];
  const re = /<tr>\s*<td>\s*\d+例目\s*<\/td>\s*<td>(.*?)<\/td>\s*<td>.*?<\/td>\s*<td>.*?<\/td>\s*<td>(.*?)<\/td>/g;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const date = m[ 1 ];
    const city = m[ 2 ];
    const dm = date.trim().match( /(.+?)(\d+)年(\d+)月(\d+)日/ );
    if ( !dm || dm[ 1 ] !== '令和' )
      continue;
    csv.push( [ new Date( parseInt( dm[ 2 ] ) + 2018, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) ), city ] );
  }
  return csv;
}
export default class PoiKyoto extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '京都府',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KYOTO_JSON.DATA_URI,
      cb_parse_csv: cr => parse_json( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

