import {config} from "../config.js";
import Log from "../logger.js";
import BasePoi from "./base_poi.js";

export default class PoiKanagawa extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '神奈川県',
      cb_alter_citys: map_poi => {
        Array.from( map_poi.keys() ).forEach( name => {
          name.match( /[村町市]$/ ) && map_poi.set( name.replace( /[村町市]$/, '保健福祉事務所管内' ), map_poi.get( name ) );
          map_poi.set( name + '保健所管内', map_poi.get( name ) );
        } );
      },
      csv_uri: config.KANAGAWA_CSV.DATA_URI,
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 3,
      col_date: 0,
      col_city: 1,
      cb_city: row => row[ 1 ].replace( /^神奈川県/g, '' )
    } );
  }
}
