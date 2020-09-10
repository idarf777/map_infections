import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  //['県外', ''],
  //['県内', ''],
  ['県内（金沢市保健所管内）', '金沢市'], 
  ['県内（石川中央保健福祉センター管内）', '金沢市'], 
  ['県内（南加賀保健福祉センター管内）', '小松市'], 
];
export default class PoiFukui extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福井県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUI_CSV.DATA_URI,
      //csv_encoding: 'CP932',
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 7,
      col_date: 4,
      col_city: 6
    } );
  }
}
