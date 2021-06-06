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
      pref_name: '山口県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.YAMAGUCHI_CSV.DATA_URI,
      row_begin: 1,
      min_columns: 5,
      col_date: 5,
      col_city: 3
    } );
  }
}
