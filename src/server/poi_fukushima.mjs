import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;
const ALTER_CITY_NAMES = [['県南', '白河市']];
function parse_json( cr )
{
  const json = JSON.parse( cr.data.toString() );
  return json.patients.data.map( v => [ new Date( v['リリース日'] ), v[ '居住地' ] ] );
}

export default class PoiFukushima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福島県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUSHIMA_JSON.DATA_URI,
      cb_parse_csv: cr => parse_json( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
