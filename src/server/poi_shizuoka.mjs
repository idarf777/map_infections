import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['県東部', '沼津市'],
  ['駿東郡', '清水町'],
  ['駿東郡清水町', '清水町'],
  ['周智郡', '森町'],
  ['田方郡', '函南町'],
  ['榛原郡', '吉田町'],
  ['賀茂郡', '西伊豆町'],
  ['富士保健所管内', '富士市'],
  ['東部保健所管内', '沼津市'],
  ['中部保健所管内', '静岡市'],
  ['西部保健所管内', '浜松市'],
  ['熱海保健所管内', '熱海市'],
  ['御殿場保健所管内', '御殿場市'],
  ['伊豆の奥西', '伊豆の国市'],
  ['東伊豆長', '東伊豆町'],
  ['浜松市内', '浜松市'],
];

export default class PoiShizuoka extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '静岡県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.SHIZUOKA_CSV.DATA_URI,
      csv_encoding: 'CP932',
      cb_city: row => row[ 7 ] || '非公表',
      row_begin: 9,
      min_columns: 8,
      col_date: 5
    } );
  }
}
