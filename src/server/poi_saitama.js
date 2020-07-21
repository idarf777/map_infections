import agh from "agh.sprintf";
import axios from "axios";
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import {config} from "../config.js";
import Log from "../logger.js";
import DbPoi from './db_poi.js';
import { parse_csv, datetostring, sanitize_poi_name } from "../util.js";

async function load_csv()
{
  const resIndex = await axios.get( config.SAITAMA_CSV.INDEX_URI );
  const lastLinkIndex = resIndex.data.lastIndexOf( config.SAITAMA_CSV.SEARCH_KEY );
  if ( lastLinkIndex < 0 )
    throw new Error( "bad html" );
  const uri = resIndex.data.substr( lastLinkIndex, config.SAITAMA_CSV.SEARCH_KEY.length + 100 ).match( /<a href="([^"]+)"/ )[ 1 ];
  if ( !uri )
    throw new Error( "bad link" );
  return axios.create( { 'responseType': 'arraybuffer' } ).get( uri );
}
export default class PoiSaitama
{
  static async load()
  {
    Log.debug( 'getting saitama CSV...' );
    const prefname = '埼玉県';
    const map_poi = await DbPoi.getMap( prefname );
    const cr = await load_csv();
    const csv = iconv.decode( cr.data, 'Shift_JIS' );

    Log.debug( 'parsing saitama CSV...' );
    const map_city_infectors = new Map();
    const rows = await parse_csv( csv );//, { columns: true } );
    let date;
    for ( let rownum=1; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < 5 )
        break;
      date = new Date( '20' + row[ 1 ] );
      const city = sanitize_poi_name( (row[ 4 ] === prefname) ? '' : row[ 4 ] );
      if ( !map_poi.get( city ) )
        continue;
      if ( !map_city_infectors.has( city ) )
        map_city_infectors.set( city, new Map() );
      const map_inf = map_city_infectors.get( city );
      map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
    }

    const spots = Array.from( map_city_infectors.entries() ).map( pair => {
      const geopos = map_poi.get( pair[ 0 ] ).geopos();
      let subtotal = 0;
      return {
        geopos,
        name: `${prefname}${pair[ 0 ]}`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return ( tm >= config.SAITAMA_CSV.DATA_BEGIN_AT.getTime() ) && { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.debug( 'parsed saitama CSV' );
    if ( spots.length === 0 )
      return {};
    const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
  }
}
