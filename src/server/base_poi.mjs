import Log from "./logger.mjs";
import {datetostring, parse_csv, sanitize_poi_name, axios_instance} from "./util.mjs";
import DbPoi from "./db_poi.mjs";
import iconv from "iconv-lite";
import mkdirp from "mkdirp";
import jschardet from "jschardet";
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

    const curdate = new Date();
    const tomorrow = new Date( `${curdate.getFullYear()}-${curdate.getMonth()+1}-${curdate.getDate()}` );
    tomorrow.setDate( tomorrow.getDate()+1 );

    // ローカルに保存しているデータ(すでに自治体のサーバから消えているなどで取得不能なデータ)をロードする
    const past_dir = path.join( path.join( config.ROOT_DIRECTORY, config.DATA_PAST_DIR ), pref_name );
    const past_data = new Set();
    let past_rows = [];
    const current_year = new Date().getFullYear();
    for ( let year = config.DATA_SINCE.getFullYear(); year <= current_year; year++ )
    {
      const buf = await fs.readFile( path.join( past_dir, `${year}.csv` ), "utf-8" ).catch( ex => {} );
      if ( buf == null )
        continue;
      // 年を含まないCSV
      Log.info( `${pref_name} : parsing ${year}'s CSV...` );
      const past_csv = await parse_csv( buf );
      if ( !past_csv || past_csv.length === 0 )
        continue;
      past_rows = past_rows.concat( past_csv.map( row => {
        // row[0] ... 月／日 (例: "10/21")  row[1] ... 市区町村名
        const date = new Date( `${year}/${row[ 0 ]}` );
        past_data.add( date.getTime() );
        return [ date, row[ 1 ] ];
      } ) );
    }
    // 過去に生成したJSON
    const jsonfiles = await BasePoi.enumerate_files(past_dir, new RegExp(/\.json$/));
    for ( let i=0; i<jsonfiles.length; i++ )
    {
      Log.info( `${pref_name} : parsing ${jsonfiles[ i ]} ...` );
      const rows = [];
      const buf = await fs.readFile( jsonfiles[ i ], 'utf-8' ).catch( ex => {} );
      if ( buf == null )
        continue;
      const json = JSON.parse( buf );
      (json.spots || []).forEach( spot => {
        let name = spot.name.substring( pref_name.length );
        const m = name.match( `^\\(生活地:(.+?)\\)` );
        if ( m )
          name = m[ 1 ];
        (spot.data || []).filter( data => data.date && data.infectors != null ).forEach( data => {
          const date = new Date( data.date );
          past_data.add( date.getTime() );
          for ( let k=0; k<data.infectors; k++ )
            rows.push( [ date, name ] );
        } );
      } );
      past_rows = past_rows.concat( rows );
    }

    Log.info( `${pref_name} : getting CSV...` );
    const map_poi = await DbPoi.getMap( pref_name );
    alter_citys && alter_citys.forEach( names => map_poi.set( names[ 0 ], map_poi.get( names[ 1 ] ) ) );
    cb_alter_citys && cb_alter_citys( map_poi );
    const cr = await (cb_load_csv ? cb_load_csv() : axios_instance( { responseType: 'arraybuffer' } ).get( csv_uri ));
    const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/${pref_name}` );
    await mkdirp( cache_dir );
    await fs.writeFile( path.join( cache_dir, 'src' ), cr.data );
    Log.info( `${pref_name} parsing CSV...` );
    const rows = await ( cb_parse_csv ? cb_parse_csv( cr ) : parse_csv( iconv.decode( cr.data, csv_encoding || jschardet.detect( cr.data ).encoding ) ) );
    const map_city_infectors = new Map(); // 都市名 - (UNIXタイムスタンプ - 感染者数のマップ)のマップ
    const parse_rows = ( params ) => {
      const { row_begin, rows, min_columns, cb_date, col_date, cb_city, col_city, past_data } = params;
      for ( let rownum = row_begin; rownum < rows.length; rownum++ )
      {
        const row = rows[ rownum ];
        if ( row.length < min_columns )
          break;
        const date = cb_date ? cb_date( row ) : new Date( row[ col_date ] );
        const tm = date?.getTime();
        if ( !date || (past_data && past_data.has( tm )) ) // ログがある日ならスキップする
          continue;
        if ( tm < config.DATA_SINCE.getTime()  ||  tm >= tomorrow.getTime() )
        {
          Log.info( `${pref_name} : row ${rownum} is invalid date ${new Date( tm )}` );
          continue;
        }
        const city = sanitize_poi_name( (cb_city && cb_city( row )) || row[ col_city ] || '' );
        if ( !map_poi.has( city ) )
        {
          Log.info( `${pref_name} : ${city} not found at ${datetostring( date )}, put into ${pref_name}` );
          map_poi.set( city, map_poi.get( '' ) );
          set_irregular.add( city );
          continue;
        }
        if ( !map_city_infectors.has( city ) )
          map_city_infectors.set( city, new Map() );
        const map_inf = map_city_infectors.get( city );
        map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
      }
    };
    parse_rows( { row_begin: 0, rows: past_rows, min_columns: 2, col_date: 0, col_city: 1 } );  // 昨年以前
    parse_rows( { row_begin, rows, min_columns, cb_date, col_date, cb_city, col_city, past_data } ); // 今年

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
      const name = (cb_name && cb_name( key )) || (pref_name +  ((!key || key === '') ? '(生活地:非公表)' : (set_irregular.has( key ) && `(生活地:${key})` ) || key) );
      const poi = map_poi.get( pair[ 0 ] );
      return {
        city_code: poi.city_cd * ((poi.city_cd < 1000) ? 1000 : 1),
        geopos: poi.geopos(),
        name,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          const infectors = pair[ 1 ].get( tm );
          subtotal += infectors;
          return { date: datetostring( tm ), infectors, subtotal }
        } ).filter( e => e )
      };
    } );
    Log.info( `${pref_name} : CSV parse complete` );
    if ( spots.length === 0  ||  spots.reduce( (sum, spot) => (sum + spot.data?.length || 0), 0 ) === 0 )
      return {};
    const tms_begin = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort( (a,b) => a.getTime() - b.getTime() );
    const tms_finish = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ spot.data.length - 1 ].date ) ).filter( e => e ).sort( (a,b) => b.getTime() - a.getTime() );
    return { pref_code: map_poi.get( '' ).city_cd, name: pref_name, begin_at: datetostring( tms_begin[ 0 ] ), finish_at: datetostring( tms_finish[ 0 ] ), spots: spots.filter( spot => spot.data.reduce( (sum, v) => sum + v.infectors, 0 ) > 0 ) };
  }

  static async enumerate_files( dir, regex )
  {
    const candidates = await fs.readdir( dir ).catch( ex => {} ) || [];
    const files = [];
    for ( let i=0; i<candidates.length; i++ )
    {
      const p = path.join( dir, candidates[ i ] );
      if ( regex && !regex.test( p ) )
        continue;
      const stat = await fs.stat( p ).catch( ex => {} );
      if ( stat?.isFile() )
        files.push( p )
    }
    return files.sort();
  }
}

