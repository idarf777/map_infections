import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['北信保健所管内', '長野市'], ['長野市保健所管内', '長野市']];
async function load_csv()
{
  const rh = await axios_instance( { responseType: 'arraybuffer' } ).get( config.NAGANO_HTML.DATA_URI );
  const html = iconv.decode( rh.data, 'UTF8' );
  const m = html.match( /<a href="(.+?)">\s*発生状況\s*（CSV：.+?<\/a>/ );
  if ( !m )
    throw new Error( "no nagano link" );
  const href = m[ 1 ];
  const prefix = config.NAGANO_HTML.DATA_URI.match( /^(http.?:\/\/.+?)\/[^.]+\.html$/ )[ 1 ];
  return axios_instance( { responseType: 'arraybuffer' } ).get( `${prefix}/${href}` );
}
export default class PoiNagano extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '長野県',
        alter_citys: ALTER_CITY_NAMES,
        cb_alter_citys: map_poi => Array.from( map_poi.keys() ).forEach( name => name.match( /[村町市]$/ ) && map_poi.set( name.replace( /[村町市]$/, '保健所管内' ), map_poi.get( name ) ) ),
        cb_load_csv: () => load_csv(),
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
