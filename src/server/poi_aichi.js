import {config} from "../config.js";
import Log from "../logger.js";
import BasePoi from "./base_poi.js";

const ALTER_CITY_NAMES = [['不定', ''], ['尾張地方', '一宮市'], ['三河地方', '岡崎市'], ['一宮保健所管内', '一宮市']];
export default class PoiAichi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '愛知県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.AICHI_CSV.DATA_URI,
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 10,
      col_date: 7,
      col_city: 4,
      cb_name: name => `愛知県${name.replace( /不定$/, '(不定)' )}`
    } );
  }
}
