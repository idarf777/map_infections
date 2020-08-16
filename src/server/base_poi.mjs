import Log from "./logger.mjs";
import {datetostring, parse_csv, sanitize_poi_name} from "./util.mjs";
import DbPoi from "./db_poi.mjs";
import iconv from "iconv-lite";
import axios from "axios";
import mkdirp from "mkdirp";
import path from "path";
import { promises as fs } from "fs";
const config = global.covid19map.config;

export default class BasePoi
{
  static async process_csv( arg )
  {
    const { pref_name, alter_citys, cb_alter_citys, csv_uri, cb_load_csv, cb_parse_csv, csv_encoding, row_begin, min_columns, col_date, cb_date, col_city, cb_city, cb_name } = arg;
    const set_irregular = new Set();

    Log.info( `getting ${pref_name} CSV...` );
    const map_poi = await DbPoi.getMap( pref_name );
    alter_citys && alter_citys.forEach( names => map_poi.set( names[ 0 ], map_poi.get( names[ 1 ] ) ) );
    cb_alter_citys && cb_alter_citys( map_poi );
    const cr = await (cb_load_csv ? cb_load_csv() : axios.create( { 'responseType': 'arraybuffer' } ).get( csv_uri ));
    const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}` );
    await mkdirp( cache_dir );
    await fs.writeFile( path.join( cache_dir, 'src' ), cr.data );
    Log.info( `parsing ${pref_name} CSV...` );
    const rows = await ( cb_parse_csv ? cb_parse_csv( cr ) : parse_csv( iconv.decode( cr.data, csv_encoding ) ) );
    const map_city_infectors = new Map();
    for ( let rownum = row_begin; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < min_columns )
        break;
      const date = cb_date ? cb_date( row ) : new Date( row[ col_date ] );
      if ( !date )
        continue;
      const city = sanitize_poi_name( (cb_city && cb_city( row )) || row[ col_city ] );
      if ( !map_poi.get( city ) )
      {
        Log.info( `${pref_name}${city} not found, put into ${pref_name}` );
        map_poi.set( city, map_poi.get( '' ) );
        set_irregular.add( city );
        continue;
      }
      if ( !map_city_infectors.has( city ) )
        map_city_infectors.set( city, new Map() );
      const map_inf = map_city_infectors.get( city );
      map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
    }

    const unpublished = map_city_infectors.get( '' ) || new Map();
    for ( const k of [pref_name, `${pref_name}内`, '非公表', '非公開'] )
    {
      for ( const pair of (map_city_infectors.get( k )?.entries() || []) )
        unpublished.set( pair[ 0 ], (unpublished.get( pair[ 0 ] ) || 0) + pair[ 1 ] );
      map_city_infectors.delete( k );
    }
    if ( unpublished.size > 0 )
      map_city_infectors.set( '', unpublished );

    const spots = Array.from( map_city_infectors.entries() ).map( pair => {
      let subtotal = 0;
      const key = pair[ 0 ];
      let name = (cb_name && cb_name( key )) || (pref_name +  ((key === '') ? '(生活地:非公表)' : (set_irregular.has( key ) && `(生活地:${key})` ) || key) );
      return {
        geopos: map_poi.get( pair[ 0 ] ).geopos(),
        name,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.info( `parsed ${pref_name} CSV` );
    if ( spots.length === 0  ||  spots.reduce( (sum, spot) => (sum + spot.data?.length || 0), 0 ) === 0 )
      return {};
    const tms_begin = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    const tms_finish = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ spot.data.length - 1 ].date ) ).filter( e => e ).sort( (a,b) => b.getTime() - a.getTime() );
    return { begin_at: datetostring( tms_begin[ 0 ] ), finish_at: datetostring( tms_finish[ 0 ] ), spots: spots.filter( spot => spot.data.reduce( (sum, v) => (sum + v.infectors ) > 0), 0 ) };
  }
}
