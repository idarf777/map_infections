import {config} from "../config.js";
import BasePoi from "./base_poi.js";

const ALTER_CITY_NAMES = [
  ['松本保健所管内', '松本市'], ['佐久保健所管内', '佐久市'], ['飯田保健所管内', '飯田市'], ['大町保健所管内', '大町市'],
  ['諏訪保健所管内', '諏訪市'], ['伊那保健所管内', '伊那市'], ['上田保健所管内', '上田市'], ['木曽保健所管内', '木曽町'],
  ['北信保健所管内', '長野市'], ['長野市保健所管内', '長野市']
];
export default class PoiNagano extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '長野県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.NAGANO_CSV.DATA_URI,
        csv_encoding: 'CP932',
        row_begin: 2,
        min_columns: 11,
        col_date: 4,
        col_city: 6
      }, row => {
        const ccn = (row[ 14 ] || '').match( /^帰省先：(.+)$/ );
        return ccn && ccn[ 1 ];
      } );
  }
}
