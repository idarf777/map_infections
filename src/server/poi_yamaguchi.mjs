import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['福岡市内', '福岡市'],
  ['糟屋郡', '粕屋町' ],
  ['京都郡', '苅田町' ],
  ['八女郡', '広川町' ],
  ['遠賀郡', '遠賀町' ],
  ['嘉穂郡', '桂川町' ],
  ['築上郡', '築上町' ],
  ['田川郡', '香春町' ],
  ['朝倉郡', '筑前町' ],
  ['三井郡', '大刀洗町' ],
  ['鞍手郡', '鞍手町' ],
  ['三潴郡', '大木町' ]
];
export default class PoiYamaguchi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '山口県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.YAMAGUCHI_CSV.DATA_URI,
//      csv_encoding: 'CP932',
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 5,
      col_date: 4,
      col_city: 3
    } );
  }
}
