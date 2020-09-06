import { config } from './make_config.mjs';
import Log from './logger.mjs';
import express from 'express';
import mkdirp from 'mkdirp';
import { promises as fs } from "fs";
import path from 'path';
import helmet from 'helmet';
import Redis from 'ioredis';
import axios from 'axios';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { datetostring } from "./util.mjs";
// CSRFは後の課題とする

// 東北
import PoiAomori from "./poi_aomori.mjs";
import PoiAkita from "./poi_akita.mjs";
import PoiYamagata from "./poi_yamagata.mjs";
import PoiIwate from "./poi_iwate.mjs";
import PoiMiyagi from "./poi_miyagi.mjs";
import PoiFukushima from "./poi_fukushima.mjs";
// 関東甲信越
import PoiTokyo from './poi_tokyo.mjs';
import PoiKanagawa from './poi_kanagawa.mjs';
import PoiChiba from "./poi_chiba.mjs";
import PoiSaitama from "./poi_saitama.mjs";
import PoiIbaraki from "./poi_ibaraki.mjs";
import PoiTochigi from "./poi_tochigi.mjs";
import PoiGunma from "./poi_gunma.mjs";
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


//import { example_data } from '../example_data.js';
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
  jsons.forEach( json => {
    if ( json.begin_at && json.finish_at )
      spots = spots.concat( json.spots.filter( spot => ((spot.data?.length || 0) > 0) ) );
  } );
  if ( spots.length === 0 )
    throw new Error( 'no data to fit' );
  return {
    begin_at: datetostring( jsons.map( json => json.begin_at && new Date( json.begin_at ).getTime() ).filter( e => e ).sort()[ 0 ] ),
    finish_at: datetostring( jsons.map( json => json.finish_at && new Date( json.finish_at ).getTime() ).filter( e => e ).sort().reverse()[ 0 ] ),
    spots: spots
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
  [ 'tokushima', PoiTokushima ],
  [ 'kagawa', PoiKagawa ],
  [ 'kochi', PoiKochi ],
  [ 'ehime', PoiEhime ],
  [ 'fukuoka', PoiFukuoka],
  [ 'nagasaki', PoiNagasaki],
  [ 'saga', PoiSaga],
  [ 'ohita', PoiOhita],
  [ 'kumamoto', PoiKumamoto],
  [ 'miyazaki', PoiMiyazaki ],
];

app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
  if ( !config.DEBUG && req.query.token !== process.env.MAKEDATA_TOKEN )
  {
    res.status( 501 ).send( 'bad auth' );
    return;
  }
  mkdirp( path.join( config.ROOT_DIRECTORY, config.SERVER_MAKE_DATA_CACHE_DIR ) )
  .then( () => Promise.all( CITIES.map( city => make_data( city ) ) ) )
  .then( jsons => {
    const merged = merge_jsons( jsons );
    res.send( merged );
    return write_city_json( config.SERVER_MAKE_DATA_FILENAME, merged );
  } )
  .then( () => Log.info( 'MAKE DATA complete.' ) )
  .catch( ex => {
    Log.error( ex );
    res.status( 500 ).send( ex.message );
  } );
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
      axios.post( url, { expires: date.toISOString(), scopes: ["styles:read", "fonts:read"] } )
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
