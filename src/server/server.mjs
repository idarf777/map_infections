import { config } from './make_config.mjs';
import Log from './logger.mjs';
import DbPoi from './db_poi.mjs';
import express from 'express';
import mkdirp from 'mkdirp';
import { promises as fs } from "fs";
import path from 'path';
import helmet from 'helmet';
import Redis from 'ioredis';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectRedis from 'connect-redis';
import {datetostring, to_bool, axios_instance, PREFECTURE_CODES} from "./util.mjs";
// CSRFは後の課題とする

// 北海道
import PoiHokkaido from "./poi_hokkaido.mjs";
// 東北
import PoiAomori from "./poi_aomori.mjs";
import PoiAkita from "./poi_akita.mjs";
import PoiYamagata from "./poi_yamagata.mjs";
import PoiIwate from "./poi_iwate.mjs";
import PoiMiyagi from "./poi_miyagi.mjs";
import PoiFukushima from "./poi_fukushima.mjs";
// 関東
import PoiTokyo from './poi_tokyo.mjs';
import PoiKanagawa from './poi_kanagawa.mjs';
import PoiChiba from "./poi_chiba.mjs";
import PoiSaitama from "./poi_saitama.mjs";
import PoiIbaraki from "./poi_ibaraki.mjs";
import PoiTochigi from "./poi_tochigi.mjs";
import PoiGunma from "./poi_gunma.mjs";
// 甲信越
import PoiNiigata from "./poi_niigata.mjs";
import PoiToyama from "./poi_toyama.mjs";
import PoiYamanashi from "./poi_yamanashi.mjs";
import PoiNagano from "./poi_nagano.mjs";
// 中部
import PoiShizuoka from "./poi_shizuoka.mjs";
import PoiAichi from "./poi_aichi.mjs";
import PoiMie from "./poi_mie.mjs";
import PoiGifu from "./poi_gifu.mjs";
// 近畿
import PoiWakayama from "./poi_wakayama.mjs";
import PoiShiga from "./poi_shiga.mjs";
import PoiKyoto from "./poi_kyoto.mjs";
import PoiNara from "./poi_nara.mjs";
import PoiOsaka from "./poi_osaka.mjs";
import PoiHyogo from "./poi_hyogo.mjs";
// 北陸
import PoiIshikawa from "./poi_ishikawa.mjs";
import PoiFukui from "./poi_fukui.mjs";
// 中国
import PoiYamaguchi from "./poi_yamaguchi.mjs";
import PoiHiroshima from "./poi_hiroshima.mjs";
import PoiOkayama from "./poi_okayama.mjs";
import PoiShimane from "./poi_shimane.mjs";
import PoiTottori from "./poi_tottori.mjs";
// 四国
import PoiTokushima from "./poi_tokushima.mjs";
import PoiKagawa from "./poi_kagawa.mjs";
import PoiKochi from "./poi_kochi.mjs";
import PoiEhime from "./poi_ehime.mjs";
// 九州
import PoiFukuoka from "./poi_fukuoka.mjs";
import PoiNagasaki from "./poi_nagasaki.mjs";
import PoiSaga from "./poi_saga.mjs";
import PoiOhita from "./poi_ohita.mjs";
import PoiKumamoto from "./poi_kumamoto.mjs";
import PoiMiyazaki from "./poi_miyazaki.mjs";
import PoiKagoshima from "./poi_kagoshima.mjs";
import PoiOkinawa from "./poi_okinawa.mjs";


//import { example_data } from '../example_data.js';
const COOKIE_OPTIONS = Object.freeze( { maxAge: config.COOKIE_EXPIRE*1000, path: config.SERVER_URI_PREFIX } );
const RedisStore = connectRedis( session );
const redis = new Redis();

async function merge_jsons( jsons )
{
  let spots = [];
  const progresses = new Map();
  jsons.forEach( json => {
    if ( !( json.begin_at && json.finish_at ) )
      return;
    const curspots = json.spots.filter( spot => ((spot.data?.length || 0) > 0) );
    if ( curspots.length === 0 )
    {
      json.begin_at = null;
      json.finish_at = null;
      return;
    }
    spots = spots.concat( curspots );
    // 都道府県単位の推移を計算する
    const map_ifc = curspots.reduce( ( map, spot ) => spot.data.reduce( ( map, d ) => {
      const c = map.get( d.date );
      return map.set( d.date, { infectors: Math.max( 0, c?.infectors || 0 ) + d.infectors, subtotal: (c?.subtotal || 0) + d.subtotal } );   // "東京都調査中"のinfectorsは負の値になり得る
    }, map ), new Map() );
    const sm = [];
    for ( const date = new Date( json.begin_at ), enddate = new Date( json.finish_at ); date.getTime() <= enddate.getTime(); date.setDate( date.getDate() + 1 ) )
    {
      const sd = datetostring( date );
      const cur = map_ifc.get( sd );
      cur && sm.push( { ...cur, date: sd } );
    }
    progresses.set( json.pref_code, sm );
  } );
  if ( spots.length === 0 )
    throw new Error( 'no data to fit' );
  const summary = jsons.filter( json => json && Object.keys( json ).length > 0 ).map( json => { return { pref_code: json.pref_code, name: json.name, begin_at: json.begin_at, finish_at: json.finish_at, subtotal: progresses.get( json.pref_code ) } } );

  // 欠けている都道府県を検出して表示する
  const errors = [];
  const suset = summary.reduce( ( set, s ) => set.add( s.pref_code ), new Set() );
  for( const pref_code of Object.values( PREFECTURE_CODES ) )
  {
     if ( !suset.has( pref_code ) )
       errors.push( `pref_code = ${pref_code} (${(await DbPoi.get( pref_code )).name}) is missing` );
  }

  const setfigure = v => Math.round( v * 1000000 ) * 0.000001;
  return {
    begin_at: datetostring( Math.min( ...jsons.map( json => json.begin_at && new Date( json.begin_at ).getTime() ).filter( e => e ) ) ),
    finish_at: datetostring( Math.max( ...jsons.map( json => json.finish_at && new Date( json.finish_at ).getTime() ).filter( e => e ) ) ),
    spots: spots.map( spot => {
      for ( let i=0; i<spot.geopos?.length || 0; i++ )
        spot.geopos[ i ] = setfigure( spot.geopos[ i ] );
      return spot;
    } ).sort( (a, b) => a.city_code - b.city_code ),
    summary: summary.sort( (a, b) => a.pref_code - b.pref_code ),
    errors
  };
}

function city_json_path( city )
{
  return path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/${city}.json` );
}
async function write_city_json( city, json, errors )
{
  if ( errors?.length !== 0 )
    json[ '$comment' ] = errors;
  return fs.writeFile( city_json_path( city ), JSON.stringify( json ), 'utf8' );
}

async function make_data( city )
{
  const pois = await city[ 1 ].load();
  await write_city_json( city[ 0 ], pois );
  Log.info( `Data of ${city[ 0 ]} ... ${datetostring( pois.begin_at )} - ${datetostring( pois.finish_at )}`  );
  return pois;
}

// ひとつひとつ順番にやる
async function execMakeDataSerial( cities )
{
  const jsons = new Array( cities.length );
  const errors = [];
  for ( let i=0; i<cities.length; i++ )
  {
    jsons[ i ] = await make_data( cities[ i ] ).catch( ex => {
      Log.error( ex );
      errors.push( `${cities[ i ][ 0 ]}: ${ex.message}` );
      return ex.pois;
    } );
    Log.info( `${cities[ i ][ 0 ]} complete.` );
  }
  return { jsons: jsons.filter( v => v ), errors };
}

// 順不同でどんどんやる
async function execMakeData( cities )
{
  let remain_cities = { ...PREFECTURE_CODES };
  const error_cities = [];
  const errors = [];
  const promises = cities.map( async city => {
    const json = await make_data( city ).catch( ex => {
      Log.error( ex );
      error_cities.push( city[ 0 ] );
      errors.push( `${city[ 0 ]}: ${ex.message}` );
      return ex.pois;
    } );
    delete remain_cities[ city[ 0 ] ];
    Log.info( `${city[ 0 ]} complete.` );
    (error_cities.length > 0) && Log.info( `    errors = ${error_cities.join( ' ' )}` );
    const remains = Object.keys( remain_cities );
    Log.info( (remains.length > 0) ? `    remains = ${remains.join( ' ' )}` : '    all cities done!' );
    return json;
  } );
  return { jsons: (await Promise.all( promises )).filter( v => v ), errors };
}

const CITIES = [
  [ 'tokyo', PoiTokyo ],
  [ 'chiba', PoiChiba ],
  [ 'saitama', PoiSaitama ],
  [ 'kanagawa', PoiKanagawa ],
  [ 'niigata', PoiNiigata ],
  [ 'aomori', PoiAomori ],
  [ 'akita', PoiAkita ],
  [ 'yamagata', PoiYamagata ],
  [ 'iwate', PoiIwate ],
  [ 'miyagi', PoiMiyagi ],
  [ 'fukushima', PoiFukushima ],
  [ 'toyama', PoiToyama ],
  [ 'yamanashi', PoiYamanashi ],
  [ 'shizuoka', PoiShizuoka ],
  [ 'aichi', PoiAichi ],
  [ 'nagano', PoiNagano ],
  [ 'mie', PoiMie ],
  [ 'wakayama', PoiWakayama ],
  [ 'shiga', PoiShiga ],
  [ 'gifu', PoiGifu ],
  [ 'kyoto', PoiKyoto ],
  [ 'nara', PoiNara ],
  [ 'osaka', PoiOsaka ],
  [ 'hyogo', PoiHyogo ],
  [ 'ibaraki', PoiIbaraki ],
  [ 'tochigi', PoiTochigi ],
  [ 'gunma', PoiGunma ],
  [ 'ishikawa', PoiIshikawa ],
  [ 'yamaguchi', PoiYamaguchi ],
  [ 'hiroshima', PoiHiroshima ],
  [ 'okayama', PoiOkayama ],
  [ 'shimane', PoiShimane ],
  [ 'tottori', PoiTottori ],
  [ 'tokushima', PoiTokushima ],
  [ 'kagawa', PoiKagawa ],
  [ 'kochi', PoiKochi ],
  [ 'ehime', PoiEhime ],
  [ 'fukuoka', PoiFukuoka ],
  [ 'nagasaki', PoiNagasaki ],
  [ 'saga', PoiSaga ],
  [ 'oita', PoiOhita ],
  [ 'kumamoto', PoiKumamoto ],
  [ 'miyazaki', PoiMiyazaki ],
  [ 'kagoshima', PoiKagoshima ],
  [ 'okinawa', PoiOkinawa ],
  [ 'fukui', PoiFukui ],
  [ 'hokkaido', PoiHokkaido ],
];
const AVAILABLE_CITIES = [
  //'fukuoka'
];

async function exec_make_data()
{
  const begintm = new Date();
  await mkdirp( path.join( config.ROOT_DIRECTORY, config.SERVER_MAKE_DATA_CACHE_DIR ) );
  const cities = (AVAILABLE_CITIES.length > 0) ? CITIES.filter( c => AVAILABLE_CITIES.some( v => c[ 0 ] === v ) ) : CITIES;
  const data = await (to_bool( process.env.MAKE_DATA_ORDERED ) ? execMakeDataSerial( cities ) : execMakeData( cities ));
  Log.info( 'merging data...' );
  const merged = await merge_jsons( data.jsons );
  Log.info( `MAKE DATA complete with ${data.errors.length} error${(data.errors.length > 1) ? 's':''} in ${(new Date().getTime() - begintm.getTime())/1000} sec.` );
  const errors = config.DEBUG ? data.errors.concat( merged.errors ) : merged.errors;
  ( errors.length > 0 ) && Log.error( errors );
  delete merged.errors;
  return { merged, errors };
}

async function busy_lock()
{
  if ( !to_bool( process.env.MAKE_DATA_BUSY_ENABLE ) )
    return null;
  const v = await redis.getset( config.SERVER_REDIS_MAKE_DATA_BUSY_KEY, 1 );
  await redis.expire( config.SERVER_REDIS_MAKE_DATA_BUSY_KEY, config.SERVER_MAKE_DATA_BUSY_EXPIRE );
  return v;
}
async function busy_unlock()
{
  return process.env.MAKE_DATA_BUSY_ENABLE ? redis.del( config.SERVER_REDIS_MAKE_DATA_BUSY_KEY ) : true;
}

function restrictKey()
{
  const date = new Date();
  return `${config.SERVER_REDIS_RESTRICT_KEY}_${date.getFullYear()}_${date.getMonth()+1}`;
}

function sendIndexHtml( req, res, token )
{
  if ( token && (!req.cookies || req.cookies[ config.COOKIE_MAP_TOKEN ] !== token) )
  {
    req.session[ config.COOKIE_MAP_TOKEN ] = token;
    req.session[ config.COOKIE_EXPIRE_DATE ] = Date.now() + COOKIE_OPTIONS.maxAge;
    res.cookie( config.COOKIE_MAP_TOKEN, token, COOKIE_OPTIONS )
  }
  res.sendFile( path.join( config.DEPLOY_DIRECTORY, 'index.html' ) );
}

function sendIndex( req, res )
{
  const uri = req.url.substring( config.SERVER_URI_PREFIX.length );
  if ( config.DEBUG && !uri.match( /^\/?(index.html)?(\?([^\/]*))?$/ ) )
  {
    // index.html以外はnginxがルーティングしないはず
    res.sendFile( path.join( config.DEPLOY_DIRECTORY, uri.replace( /\.\./g, '' ) ) );
    return;
  }
  const url = process.env.MAPBOX_AT;
  if ( (url || '') === '' )
  {
    sendIndexHtml( req, res, process.env.REACT_APP_MapboxAccessToken );
    return;
  }
  redis.incr( restrictKey() )
    .then( async counter => {
      if ( counter > config.SERVER_RESTRICT_MAX  ||  (req.session[ config.COOKIE_EXPIRE_DATE ] || 0) > Date.now() )
      {
        sendIndexHtml( req, res );
        return;
      }
      const date = new Date();
      date.setSeconds( date.getSeconds() + config.SERVER_AUTHORIZE_EXPIRE );
      const response = await axios_instance().post( url, { expires: date.toISOString(), scopes: ["styles:read", "fonts:read"], timeout: config.HTTP_POST_TIMEOUT } )
        .catch( err => {
          Log.debug( err );
          res.status( 500 ).send( "MAPBOX NOT AUTHORIZED" );
        } );
      response && sendIndexHtml( req, res, response.data.token );
    } );
}

if ( process.env.CI_TEST_SERVER )
{
  exec_make_data()
    .then( r => write_city_json( config.SERVER_MAKE_DATA_FILENAME, r.merged, r.errors ) )
    .then( () => process.exit( 0 ) )
    .catch( ex => Log.error( ex ) );
}
else
{
  const app = express();
  app.use( cookieParser() );
  app.use( helmet.xssFilter() );
  app.use( session( {
    secret: 'covid19sessionkey',
    saveUninitialized: true,
    resave: true,
    store: new RedisStore( {
      client: redis,
      prefix: 'session:'
    } ),
    cookie: {
      ...COOKIE_OPTIONS,
      httpOnly: false,
      secure: !config.DEBUG
    } } ) );
  if ( config.DEBUG || config.SERVER_ALLOW_FROM_ALL )
  {
    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", config.SERVER_ALLOW_FROM_ALL ? '*' : "http://localhost:3000");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });
  }
  app.use( `${config.SERVER_URI_PREFIX}/static`, express.static( path.join( config.DEPLOY_DIRECTORY, 'static' ) ) );

  app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
    if ( !config.DEBUG && req.query.token !== process.env.MAKEDATA_TOKEN )
    {
      res.status( 501 ).send( 'bad auth' );
      return;
    }
    (req.query.unbusy ? busy_unlock() : busy_lock())
      .then( async v => {
        if ( v )
          throw new Error( 'busy' );
        const md = await exec_make_data();
        await write_city_json( config.SERVER_MAKE_DATA_FILENAME, md.merged, md.errors );
        res.send( md.merged );
      } )
      .catch( ex => {
        if ( ex.message !== 'busy' )
          redis.del( config.SERVER_REDIS_MAKE_DATA_BUSY_KEY );
        Log.error( ex );
        res.status( 500 ).send( ex.message )
      } )
      .finally( () => busy_unlock().then( () => {} ) );
  } );

  app.get( config.SERVER_URI, (req, res) => {
    const p = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/${config.SERVER_MAKE_DATA_FILENAME}.json` );
    fs.stat( p )
      .then( stat => {
        if ( !stat?.isFile() )
          throw new Error( 'no json' );
        res.sendFile( p );
      } )
      .catch( err => {
        Log.debug( err );
        res.status( 500 ).send( {message: `get "${config.SERVER_MAKE_DATA_URI}" first!`} );
      } );
    }
  );

  app.get( `${config.SERVER_URI_PREFIX}/*`, sendIndex );
  app.get( config.SERVER_URI_PREFIX, sendIndex );

  busy_unlock().then( () =>
    app.listen( config.SERVER_PORT, () => {
      Log.info( `server is running at port ${config.SERVER_PORT}` );
    })
  );
}
