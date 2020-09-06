import iconv from "iconv-lite";
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
];
async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] || p[ 'リリース日' ] ), p[ '居住地' ] ] );
}
export default class PoiShiga extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '滋賀県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.SHIGA_JSON.DATA_URI,
      cb_parse_csv: cr => parse_json( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
