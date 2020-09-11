import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
];
export default class PoiFukui extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福井県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUI_CSV.DATA_URI,
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 7,
      col_date: 4,
      col_city: 6
    } );
  }
}
