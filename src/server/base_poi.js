import Log from "../logger";
import {datetostring, parse_csv, sanitize_poi_name} from "../util";
import DbPoi from "./db_poi";
import iconv from "iconv-lite";
import axios from "axios";
import {config} from "../config";

export default class BasePoi
{
  static async process_csv( arg, cbcity )
  {
    const { pref_name, alter_citys, csv_uri, csv_encoding, row_begin, min_columns, col_date, col_city } = arg;

    Log.debug( `getting ${pref_name} CSV...` );
    const map_poi = await DbPoi.getMap( pref_name );
    alter_citys && alter_citys.forEach( names => map_poi.set( names[ 0 ], map_poi.get( names[ 1 ] ) ) );
    const cr = await axios.create( { 'responseType': 'arraybuffer' } ).get( csv_uri );
    const csv = iconv.decode( cr.data, csv_encoding );

    Log.debug( `parsing ${pref_name} CSV...` );
    const map_city_infectors = new Map();
    const rows = await parse_csv( csv );//, { columns: true } );
    for ( let rownum = row_begin; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      if ( row.length < min_columns )
        break;
      const date = new Date( row[ col_date ] );
      const city = sanitize_poi_name( (cbcity && cbcity( row )) || row[ col_city ] );
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
        name: `長野県${pair[ 0 ]}`,
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
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };

  }
}
