import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['安芸郡', '府中町']
];

export default class PoiHiroshima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '広島県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.HIROSHIMA_CSV.DATA_URI,
        csv_encoding: 'CP932',
        row_begin: 1,
        min_columns: 8,
        col_date: 4,
        col_city: 7
    });
  }
}
