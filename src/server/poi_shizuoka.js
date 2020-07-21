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
  return axios.create( { 'responseType': 'arraybuffer' } ).get( config.SHIZUOKA_CSV.DATA_URI );
}
export default class PoiShizuoka
{
  static async load()
  {
    Log.debug( 'getting shizuoka CSV...' );
    const map_poi = await DbPoi.getMap( '静岡県' );
    const cr = await load_csv();
    const csv = iconv.decode( cr.data, 'Shift_JIS' );

    Log.debug( 'parsing shizuoka CSV...' );
    const map_city_infectors = new Map();
    const rows = await parse_csv( csv );//, { columns: true } );
    let date;
    for ( let rownum=1; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < 7 )
        break;
      date = new Date( row[ 4 ] );
      if ( row[ 2 ] !== '静岡県' )
        continue;
      const city = sanitize_poi_name( row[ 6 ].replace( /^駿東郡$/g, '清水町' ).replace( /^周智郡$/g, '森町' ).replace( /^田方郡$/g, '函南町' ).replace( /^榛原郡$/g, '吉田町' ).replace( /^東部保健所管内$/g, '沼津市' ).replace( /^中部保健所管内$/g, '静岡市' ).replace( /^西部保健所管内$/g, '浜松市' ) );
      if ( !map_poi.has( city ) )
        continue;
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
        name: `静岡県${pair[ 0 ]}`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return ( tm >= config.KANAGAWA_CSV.DATA_BEGIN_AT.getTime() ) && { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.debug( 'parsed shizuoka CSV' );
    if ( spots.length === 0 )
      return {};
    const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
  }
}
