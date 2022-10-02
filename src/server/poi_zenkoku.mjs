import Log from "./logger.mjs";
import {datetostring, parse_csv, sanitize_poi_name, axios_instance} from "./util.mjs";
import DbPoi from "./db_poi.mjs";
import iconv from "iconv-lite";
import mkdirp from "mkdirp";
import jschardet from "jschardet";
import {CITIES} from "./server.mjs";
const config = global.covid19map.config;

export default class PoiZenkoku
{
  static async load()
  {
    Log.info( 'getting zenkoku CSV...' );
    const csv_uri = config.ZENKOKU_CSV.DATA_URI;
    const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( csv_uri );
    const rows = await parse_csv( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ) );
    const map_pref_infectors = new Map(); // 県名 - (UNIXタイムスタンプ - 感染者数のマップ)のマップ
    const map_idx_city = new Map();
    rows[ 0 ].forEach( (col, i) => {
      const pref = col.toLowerCase();
      if ( CITIES.findIndex( v => v[ 0 ] === pref ) >= 0 )
      {
        map_idx_city.set( i, pref );
        map_pref_infectors.set( i, new Map() );
      }
    } );

    for ( let rownum = 1; rownum < rows.length; rownum++ )
    {
      const row = rows[ rownum ];
      const date = new Date( row[ 0 ] );
      const timestamp = date.getTime();

      Array.from( map_idx_city.keys() ).forEach( idx => {
        const cur = parseInt( row[ idx ] );
        map_pref_infectors.get( idx ).set( timestamp, cur );
      } );
    }
    const m = new Map();
    Array.from( map_idx_city.keys() ).forEach( idx => {
      m.set( map_idx_city.get( idx ), map_pref_infectors.get( idx ) );
    } );
    return m;
  }
}
