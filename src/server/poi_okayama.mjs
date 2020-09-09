import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['', '']
];
export default class PoiYamaguchi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '岡山県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.OKAYAMA_CSV.DATA_URI,
      csv_encoding: 'CP932',
      //csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 6,
      col_date: 3,
      col_city: 5
    } );
  }
}
