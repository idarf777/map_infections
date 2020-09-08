import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  //['岡山県', ''],
  ['安芸福祉保健所管内', '安芸市'],
  ['中央東福祉保健所', '南国市'],
  ['中央東福祉保健所管内', '南国市'],
  ['中央西福祉保健所管内', '土佐市'],
  //['愛知県', ''],
  ['須崎福祉保健所管内', '須崎市'],
  //['大阪府', ''],
  ['幡多福祉保健所', '土佐清水市'],
  ['幡多福祉保健所管内', '土佐清水市']
];
export default class PoiKochi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '高知県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KOCHI_CSV.DATA_URI,
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 8,
      col_date: 4,
      col_city: 7
    } );
  }
}
