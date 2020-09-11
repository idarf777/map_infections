import { config } from './make_config.mjs';
import Log from './logger.mjs';
import express from 'express';
import mkdirp from 'mkdirp';
import { promises as fs } from "fs";
import path from 'path';
import helmet from 'helmet';
import Redis from 'ioredis';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { datetostring, to_bool } from "./util.mjs";
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
axiosRetry( axios, { retries: config.HTTP_RETRY } );
const COOKIE_OPTIONS = Object.freeze( { maxAge: config.COOKIE_EXPIRE*1000, path: config.SERVER_URI_PREFIX } );
const RedisStore = connectRedis( session );
const redis = new Redis();
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

function merge_jsons( jsons )
{
  let spots = [];
  const progresses = {};
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
    const map_ifc = new Map();
    curspots.forEach( spot => spot.data.forEach( d => map_ifc.set( d.date, (map_ifc.get( d.date ) || 0) + d.infectors ) ) );  // 同日の新規感染者数の合計
    const sm = [];
    let st = 0;
    for ( const date = new Date( json.begin_at ), enddate = new Date( json.finish_at ); date.getTime() <= enddate.getTime(); date.setDate( date.getDate() + 1 ) )
    {
      const sd = datetostring( date );
      const n = map_ifc.get( sd ) || 0;
      st += n;
      if ( n > 0 )
        sm.push( { date: sd, infectors: n, subtotal: st } );
    }
    progresses[ json.pref_code ] = sm;
  } );
  if ( spots.length === 0 )
    throw new Error( 'no data to fit' );
  return {
    begin_at: datetostring( Math.min( ...jsons.map( json => json.begin_at && new Date( json.begin_at ).getTime() ).filter( e => e ) ) ),
    finish_at: datetostring( Math.max( ...jsons.map( json => json.finish_at && new Date( json.finish_at ).getTime() ).filter( e => e ) ) ),
    spots: spots,
    summary: jsons.map( json => { return { pref_code: json.pref_code, name: json.name, begin_at: json.begin_at, finish_at: json.finish_at, subtotal: progresses[ json.pref_code ] } } ).sort( (a, b) => a.pref_code - b.pref_code )
  };
}

async function write_city_json( city, json )
{
  return fs.writeFile( path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/${city}.json` ), JSON.stringify( json ), 'utf8' );
}

async function make_data( city )
{
  const pois = await city[ 1 ].load();
  await write_city_json( city[ 0 ], pois );
  Log.info( `Data of ${city[ 0 ]} ... ${datetostring( pois.begin_at )} - ${datetostring( pois.finish_at )}`  );
  return pois;
}

async function execMakeData( cities )
{
  const jsons = new Array( cities.length );
  const errors = [];
  for ( let i=0; i<cities.length; i++ )
  {
    try
    {
      jsons[ i ] = await make_data( cities[ i ] );  // mapだとラムダ式が別関数とみなされてawaitがエラーになる
    }
    catch ( ex )
    {
      Log.error( ex );
      errors.push( `${cities[ i ][ 0 ]}: ${ex.message}` );
    }
  }
  return { jsons: jsons.filter( v => v ), errors };
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
  [ 'ohita', PoiOhita ],
  [ 'kumamoto', PoiKumamoto ],
  [ 'miyazaki', PoiMiyazaki ],
  [ 'kagoshima', PoiKagoshima ],
  [ 'okinawa', PoiOkinawa ],
  [ 'fukui', PoiFukui ],
  [ 'hokkaido', PoiHokkaido ],
];

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

// Promise.allは、どれか例外があると残りの実行が不定になるので使わない
app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
  if ( !config.DEBUG && req.query.token !== process.env.MAKEDATA_TOKEN )
  {
    res.status( 501 ).send( 'bad auth' );
    return;
  }
  (req.query.unbusy ? busy_unlock() : busy_lock())
    .then( v => {
      if ( v )
        throw new Error( 'busy' );
      return mkdirp( path.join( config.ROOT_DIRECTORY, config.SERVER_MAKE_DATA_CACHE_DIR ) );
    } )
    .then( () => {
      if ( to_bool( process.env.MAKE_DATA_ORDERED ) )
      {
        // ひとつひとつ順番にやる
        let data, errors;
        execMakeData( CITIES )
          .then( r => {
            errors = r.errors;
            return merge_jsons( r.jsons );
          } )
          .then( merged => {
            data = merged;
            return write_city_json( config.SERVER_MAKE_DATA_FILENAME, merged );
          } )
          .then( r => busy_unlock() )
          .then( r => res.send( data ) )
          .then( r => {
            Log.info( `MAKE DATA complete with ${errors.length} error(s).` );
            ( errors.length > 0 ) && Log.error( errors );
          } )
          .catch( ex => {
            Log.error( ex );
            res.status( 500 ).send( ex.message )
          } );
      }
      else
      {
        // 全て非同期で一斉にやる
        const jsons = [], errors = [];
        let count = 0;
        CITIES.map( city => {
          make_data( city )
            .then( data => jsons.push( data ) )
            .catch( err => {
              Log.error( err );
              errors.push( `${city[ 0 ]}: ${err.message}` );
            } )
            .finally( () => {
              Log.info( `${city[ 0 ]} complete.` );
              if ( ++count < CITIES.length )
                return;
              Log.info( 'merging data...' )
              const merged = merge_jsons( jsons );
              Log.info( `merged with ${errors.length} ERROR${(errors.length > 1) ? 's':''}:` );
              if ( errors.length > 0 )
                Log.error( errors );
              write_city_json( config.SERVER_MAKE_DATA_FILENAME, merged )
                .then( r => busy_unlock() )
                .then( r => res.send( merged ) )
                .then( r => Log.info( 'MAKE DATA complete.' ) )
                .catch( ex => {
                  Log.error( ex );
                  res.status( 500 ).send( ex.message )
                } );
            } );
        } )
      }
    } )
    .catch( ex => {
      if ( ex.message !== 'busy' )
        redis.del( config.SERVER_REDIS_MAKE_DATA_BUSY_KEY );
      Log.error( ex );
      res.status( 500 ).send( ex.message );
    } )
})

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
    .then( counter => {
      if ( counter > config.SERVER_RESTRICT_MAX  ||  (req.session[ config.COOKIE_EXPIRE_DATE ] || 0) > Date.now() )
      {
        sendIndexHtml( req, res );
        return;
      }
      const date = new Date();
      date.setSeconds( date.getSeconds() + config.SERVER_AUTHORIZE_EXPIRE );
      axios.post( url, { expires: date.toISOString(), scopes: ["styles:read", "fonts:read"], timeout: config.HTTP_POST_TIMEOUT } )
        .then( response => {
          sendIndexHtml( req, res, response.data.token );
        } )
        .catch( err => {
          Log.debug( err );
          res.status( 500 ).send( "MAPBOX NOT AUTHORIZED" );
        } )
    } );
}
app.get( `${config.SERVER_URI_PREFIX}/*`, sendIndex );
app.get( config.SERVER_URI_PREFIX, sendIndex );

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
