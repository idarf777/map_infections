import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

export default class PoiMie extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '三重県',
        cb_alter_citys: map_poi => Array.from( map_poi.keys() ).forEach( name => name.match( /[村町市]$/ ) && map_poi.set( name.replace( /[村町市]$/, '保健所管内' ), map_poi.get( name ) ) ),
        csv_uri: config.MIE_CSV.DATA_URI,
        csv_encoding: 'CP932',
        row_begin: 1,
        min_columns: 10,
        col_date: 4,
        col_city: 9
    });
  }
}
