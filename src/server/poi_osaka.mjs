import iconv from "iconv-lite";
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const PLACE_SINCE_DISUSE = '個票廃止のため不明';
const ALTER_CITY_NAMES = [];

async function parse_json( cr )
{
  const date_disused = new Date( '2020-11-16' );  // 大阪府が個票を廃止した日
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] ).concat(
    json[ 'patients_summary' ][ 'data' ].map( p => {
      const date = new Date( p[ '日付' ] );
      const v = [];
      if ( date.getTime() >= date_disused.getTime() )
      {
        // 個票が廃止されたため感染者の居住地情報が存在しない
        for ( let i=0,n=p[ '小計' ]; i < n; i++ )
          v.push( [ date, PLACE_SINCE_DISUSE ] );
      }
      return v;
    } ).flat( 1 )
  );
}
export default class PoiOsaka extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '大阪府',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.OSAKA_JSON.DATA_URI,
      cb_parse_csv: cr => parse_json( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
