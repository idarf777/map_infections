import {config} from "../config.js";
import Log from "../logger.js";
import BasePoi from "./base_poi.js";

const ALTER_CITY_NAMES = [['浜松市内', '浜松市'], ['駿東郡', '清水町'], ['周智郡', '森町'], ['田方郡', '函南町'], ['榛原郡', '吉田町'], ['賀茂郡', '西伊豆町'], ['東部保健所管内', '沼津市'], ['中部保健所管内', '静岡市'], ['西部保健所管内', '浜松市']];
export default class PoiShizuoka extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '静岡県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.SHIZUOKA_CSV.DATA_URI,
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 7,
      col_date: 4,
      col_city: 6
    } );
  }
}
