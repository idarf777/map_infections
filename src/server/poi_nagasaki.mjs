import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['福岡市内', '福岡市'],
];
export default class PoiNagasaki extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '長崎県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.NAGASAKI_CSV.DATA_URI,
//      csv_encoding: 'CP932',
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 6,
      col_date: 4,
      col_city: 3
    } );
  }
}
