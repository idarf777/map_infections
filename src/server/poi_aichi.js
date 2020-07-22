import agh from "agh.sprintf";
import axios from "axios";
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import {config} from "../config.js";
import Log from "../logger.js";
import DbPoi from './db_poi.js';
import { parse_csv, datetostring, sanitize_poi_name } from "../util.js";

const ALTER_CITY_NAMES = [['不定', ''], ['尾張地方', '一宮市'], ['三河地方', '岡崎市'], ['一宮保健所管内', '一宮市']];
async function load_csv()
{
  return axios.create( { 'responseType': 'arraybuffer' } ).get( config.AICHI_CSV.DATA_URI );
}
export default class PoiAichi
{
  static async load()
  {
    Log.debug( 'getting aichi CSV...' );
    const map_poi = await DbPoi.getMap( '愛知県' );
    ALTER_CITY_NAMES.forEach( names => map_poi.set( names[ 0 ], map_poi.get( names[ 1 ] ) ) );
    const cr = await load_csv();
    const csv = iconv.decode( cr.data, 'UTF8' );

    Log.debug( 'parsing aichi CSV...' );
    const map_city_infectors = new Map();
    const rows = await parse_csv( csv );//, { columns: true } );
    let date;
    for ( let rownum=1; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < 10 )
        break;
      date = new Date( row[ 7 ] );
      let city = sanitize_poi_name( row[ 4 ] );
      if ( !map_poi.get( city ) )
      {
        Log.info( `愛知県${city} not found` );
        continue;
      }
      if ( !map_city_infectors.has( city ) )
        map_city_infectors.set( city, new Map() );
      const map_inf = map_city_infectors.get( city );
      map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
    }

    const spots = Array.from( map_city_infectors.entries() ).map( pair => {
      const geopos = map_poi.get( pair[ 0 ] ).geopos();
      if ( !geopos )
        throw new Error( 'bad city name' );
      let subtotal = 0;
      return {
        geopos,
        name: `愛知県${pair[ 0 ]}`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return ( tm >= config.KANAGAWA_CSV.DATA_BEGIN_AT.getTime() ) && { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.debug( 'parsed aichi CSV' );
    if ( spots.length === 0 )
      return {};
    const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
  }
}
