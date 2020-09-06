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
  // const ALTER_CITY_NAMES = [['浜松市内', '浜松市'], ['駿東郡', '清水町'], ['周智郡', '森町'], ['田方郡', '函南町'], ['榛原郡', '吉田町'], ['賀茂郡', '西伊豆町'], ['東部保健所管内', '沼津市'], ['中部保健所管内', '静岡市'], ['西部保健所管内', '浜松市']];
  // BasePoi.process_csv( {
  //  pref_name: '静岡県',               // [必須] 都道府県名
  //  alter_citys: ALTER_CITY_NAMES,    // 市区町村の別名
  //  cb_alter_citys: map_poi => altercitys( map_poi ), // 市区町村名のMapを操作する
  //  csv_uri, config.SHIZUOKA_CSV.DATA_URI,  // CSVのダウンロード元URI
  //  cb_load_csv: () => load_csv(),  // CSVをダウンロードする csv_uriは無効になる
  //  cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ),  // CSVをパースする csv_encodingは無効になる
  //  csv_encoding: 'CP932',  // CSVの文字コード
  //  row_begin: 1,     // データ開始行 0-origin
  //  min_columns: 10,  // 最小列数
  //  col_date: 1,      // 年月日の列  0-origin
  //  cb_date: row => new Date( row[ 1 ] ), // 年月日をパースする  col_dateは無効になる
  //  col_city: 2,      // 市区町村の列  0-origin
  //  cb_city: row => row[ 2 ],        // 市区町村をパースする  col_cityは無効になる
  //  cb_name: row => row[ 3 ] + '市'  // 市区町村名を操作する
  // } )
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
    return { begin_at: datetostring( tms_begin[ 0 ] ), finish_at: datetostring( tms_finish[ 0 ] ), spots: spots.filter( spot => spot.data.reduce( (sum, v) => sum + v.infectors, 0 ) > 0 ) };
  }
}
