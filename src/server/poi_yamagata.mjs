import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;

async function load_csv()
{
  const resIndex = await axios_instance().get( config.YAMAGATA_CSV.INDEX_URI );
  const m = resIndex.data.match( /<a href="([^.]+?\.csv)".+?陽性患者属性/ );
  if ( m == null )
    throw new Error( "no uri on yamagata-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.YAMAGATA_CSV.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
export default class PoiYamagata extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '山形県',
      cb_load_csv: () => load_csv(),
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 5,
      col_city: 5,
      col_date: 4
    } );
  }
}
