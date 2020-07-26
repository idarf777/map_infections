import {config} from "../config.js";
import BasePoi from "./base_poi.js";

const ALTER_CITY_NAMES = [['北信保健所管内', '長野市'], ['長野市保健所管内', '長野市']];
export default class PoiNagano extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '長野県',
        alter_citys: ALTER_CITY_NAMES,
        cb_alter_citys: map_poi => Array.from( map_poi.keys() ).forEach( name => name.match( /[村町市]$/ ) && map_poi.set( name.replace( /[村町市]$/, '保健所管内' ), map_poi.get( name ) ) ),
        csv_uri: config.NAGANO_CSV.DATA_URI,
        csv_encoding: 'CP932',
        row_begin: 2,
        min_columns: 11,
        col_date: 4,
        col_city: 6,
        cb_city: row => {
          const ccn = (row[ 14 ] || '').match( /^帰省先：(.+)$/ );
          return ccn && ccn[ 1 ];
        }
    });
  }
}
