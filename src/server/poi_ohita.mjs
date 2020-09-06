import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  //['その他', ''],
  //['非公表', ''],
];
export default class PoiOhita extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '大分県',
//      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.OHITA_CSV.DATA_URI,
//      csv_encoding: 'CP932',
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 8,
      col_date: 4,
      col_city: 7
    } );
  }
}
