import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['五所川原保健所管内', '五所川原市'],
  ['上十三保健所管内', '十和田市'],
  ['八戸市保健所管内', '八戸市'],
  ['青森市保健所管内', '青森市'],
];
async function load_csv()
{
  const resIndex = await axios_instance().get( config.AOMORI_CSV.INDEX_URI );
  const m = resIndex.data.match( /陽性患者関係\.csv[\s\S]+?<a .*?class="download".*?href="([^.]+?\.csv)"/ );
  if ( m == null )
    throw new Error( "no uri on aomori-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.AOMORI_CSV.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
export default class PoiAomori extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '青森県',
      alter_citys: ALTER_CITY_NAMES,
      cb_load_csv: () => load_csv(),
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 7,
      cb_city: row => {
        const city = row[ 6 ] || row[ 3 ] || '';
        const am = city.match( /[:：]([^)）]+)/ );
        return am ? am[ 1 ] : city;
      },
      cb_date: row => {
        const m = row[ 5 ].match( /(\d+)年(\d+)月(\d+)日/ );
        if ( !m )
          throw new Error( "bad date in aomori-pref" );
        return new Date( parseInt( m[ 1 ] ), parseInt( m[ 2 ] )-1, parseInt( m[ 3 ] ) );
      }
    } );
  }
}
