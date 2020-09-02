import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['福岡市内', '福岡市'],
];
export default class PoiFukuoka extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福岡県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUOKA_CSV.DATA_URI,
//      csv_encoding: 'CP932',
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 8,
      col_date: 4,
      col_city: 7
    } );
  }
}
