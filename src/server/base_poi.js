import Log from "../logger";
import {datetostring, parse_csv, sanitize_poi_name} from "../util";
import DbPoi from "./db_poi";
import iconv from "iconv-lite";
import axios from "axios";
import {config} from "../config";

export default class BasePoi
{
  static async process_csv( arg )
  {
    const { pref_name, alter_citys, cb_alter_citys, csv_uri, cb_load_csv, cb_parse_csv, csv_encoding, row_begin, min_columns, col_date, cb_date, col_city, cb_city, cb_name } = arg;

    Log.debug( `getting ${pref_name} CSV...` );
    const map_poi = await DbPoi.getMap( pref_name );
    map_poi.set( '非公表', map_poi.get( '' ) );
    alter_citys && alter_citys.forEach( names => map_poi.set( names[ 0 ], map_poi.get( names[ 1 ] ) ) );
    cb_alter_citys && cb_alter_citys( map_poi );
    const cr = await (cb_load_csv ? cb_load_csv() : axios.create( { 'responseType': 'arraybuffer' } ).get( csv_uri ));
    Log.debug( `parsing ${pref_name} CSV...` );
    const rows = await ( cb_parse_csv ? cb_parse_csv( cr ) : parse_csv( iconv.decode( cr.data, csv_encoding ) ) );
    const map_city_infectors = new Map();
    for ( let rownum = row_begin; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < min_columns )
        break;
      const date = cb_date ? cb_date( row ) : new Date( row[ col_date ] );
      const city = sanitize_poi_name( (cb_city && cb_city( row )) || row[ col_city ] );
      if ( !map_poi.get( city ) )
      {
        Log.info( `${pref_name}${city} not found` );
        continue;
      }
      if ( !map_city_infectors.has( city ) )
        map_city_infectors.set( city, new Map() );
      const map_inf = map_city_infectors.get( city );
      map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
    }

    const spots = Array.from( map_city_infectors.entries() ).map( pair => {
      let subtotal = 0;
      return {
        geopos: map_poi.get( pair[ 0 ] ).geopos(),
        name: (cb_name && cb_name( pair[ 0 ] )) || `${pref_name}${pair[ 0 ].replace( new RegExp( '^' + pref_name + '$' ), '' ).replace( /非公表$/, '(非公表)' ) }`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.debug( `parsed ${pref_name} CSV` );
    if ( spots.length === 0 )
      return {};
    const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots: spots.filter( spot => spot.data.reduce( (sum, v) => (sum + v.infectors ) > 0), 0 ) };
  }
}
