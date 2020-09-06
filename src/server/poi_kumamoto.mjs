import iconv from "iconv-lite";
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['阿蘇保健所管内', '阿蘇市'],
  ['菊池保健所管内', '菊池市'],
  ['山鹿保健所管内', '山鹿市'],
  ['天草保健所管内', '天草市'],
  ['天草保健所管内', '玉名市'],
];
async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] );
}
export default class PoiKumamoto extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '熊本県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KUMAMOTO_JSON.DATA_URI,
      cb_parse_csv: cr => parse_json( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
