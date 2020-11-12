import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['胆振総合振興局管内', '苫小牧市'],
  ['上川総合振興局管内', '富良野市'],
  ['石狩振興局管内', '札幌市'],
  ['オホーツク総合振興局管内', '網走市'],
  ['ｵﾎｰﾂｸ総合振興局管内', '網走市'],
  ['釧路総合振興局管内', '釧路市'],
  ['釧路総合振興局', '釧路市'],
  ['十勝総合振興局管内', '帯広市'],
  ['十勝総合振興局', '帯広市'],
  ['空知総合振興局管内', '岩見沢市'],
  ['宗谷総合振興局管内', '稚内市'],
  ['宗谷総合誌振興局管内', '稚内市'],  // 誤字
  ['後志総合振興局', '小樽市'],
  ['後志総合振興局管内', '小樽市'],
  ['日高振興局管内', '日高町'],
  ['日高振興局', '日高町'],
  ['渡島総合振興局管内', '函館市'],
  ['檜山振興局管内', '江差町'],
  ['留萌振興局管内', '留萌市'],
  ['根室振興局管内', '根室市'],
];
export default class PoiHokkaido extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '北海道',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.HOKKAIDO_CSV.DATA_URI,
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 7,
      col_date: 4,
      col_city: 6
    } );
  }
}
