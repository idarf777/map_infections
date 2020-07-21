import agh from "agh.sprintf";
import axios from "axios";
import xlsx from 'xlsx';
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring, sanitize_poi_name } from "../util.js";
import DbPoi from "./db_poi.js";

async function load_xlsx()
{
  const response = await axios.create( { 'responseType': 'arraybuffer' } ).get( config.YAMANASHI_XLS.DATA_URI );
  const book = xlsx.read( response.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 2; row < rows; row++ )
  {
    const cellDate = worksheet[ `D${row}` ];
    const cellPref = worksheet[ `C${row}` ];
    const cellCity = worksheet[ `H${row}` ];
    if ( cellDate?.t !== 'd' || cellCity?.t !== 's' || cellPref?.t !== 's' )
      break;
    if ( cellPref.v !== '山梨県' )
      continue;
    let city = cellCity.v.replace( /\s/g, ' ' ).replace( /（/g, '(' ).replace( /）/g, ')' );
    if ( city.indexOf( '(' ) >= 0 )
      city = city.match( /^.+?\((.+?)[,、　\s)]/ )[ 1 ]; // 最初の居住地だけをとる
    csv.push( [ cellDate.v, sanitize_poi_name( city ) ] );
  }
  return csv;
}
export default class PoiYamanashi
{
  static async load()
  {
    Log.debug( 'getting chiba XLSX...' );
    const map_poi = await DbPoi.getMap( '山梨県' );
    const rows = await load_xlsx();
    const map_city_infectors = new Map();
    for ( let rownum=0; rownum < rows.length; rownum++ )
    {
      const date = rows[ rownum ][ 0 ];
      const city = sanitize_poi_name( (rows[ rownum ][ 1 ] === '山梨県') ? '' : rows[ rownum ][ 1 ] );
      if ( !map_poi.get( city ) )
        continue;
      if ( !map_city_infectors.get( city ) )
        map_city_infectors.set( city, new Map() );
      const map_inf = map_city_infectors.get( city );
      map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
    }

    const spots = Array.from( map_city_infectors.entries() ).map( pair => {
      let subtotal = 0;
      return {
        geopos: map_poi.get( pair[ 0 ] ).geopos(),
        name: `山梨県${pair[ 0 ]}`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return ( tm >= config.YAMANASHI_XLS.DATA_BEGIN_AT.getTime() ) && { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.debug( 'parsed yamanashi XLSX' );
    if ( spots.length === 0 )
      return {};
    const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
  }
}
