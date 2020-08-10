import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

export default class PoiGifu extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '岐阜県',
        csv_uri: config.GIFU_CSV.DATA_URI,
        csv_encoding: 'CP932',
        row_begin: 1,
        min_columns: 7,
        col_date: 4,
        col_city: 6
    });
  }
}
