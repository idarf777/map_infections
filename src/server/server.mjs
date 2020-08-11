import { config } from './make_config.mjs';
import Log from './logger.mjs';
import express from 'express';
import mkdirp from 'mkdirp';
import { promises as fs } from "fs";
import path from 'path';
import helmet from 'helmet';
import Redis from 'ioredis';
import axios from 'axios';
import { datetostring } from "./util.mjs";
// CSRFは後の課題とする
import PoiTokyo from './poi_tokyo.mjs';
import PoiKanagawa from './poi_kanagawa.mjs';
import PoiChiba from "./poi_chiba.mjs";
import PoiSaitama from "./poi_saitama.mjs";
import PoiYamanashi from "./poi_yamanashi.mjs";
import PoiShizuoka from "./poi_shizuoka.mjs";
import PoiAichi from "./poi_aichi.mjs";
import PoiNagano from "./poi_nagano.mjs";
import PoiMie from "./poi_mie.mjs";
import PoiWakayama from "./poi_wakayama.mjs";
import PoiGifu from "./poi_gifu.mjs";
import PoiKyoto from "./poi_kyoto.mjs";
import PoiNara from "./poi_nara.mjs";
import PoiOsaka from "./poi_osaka.mjs";
//import { example_data } from '../example_data.js';

const redis = new Redis();
const app = express();
app.use( helmet.xssFilter() );
if ( config.DEBUG || config.SERVER_ALLOW_FROM_ALL )
{
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", config.SERVER_ALLOW_FROM_ALL ? '*' : "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}
app.use( config.SERVER_URI_PREFIX, express.static( config.DEPLOY_DIRECTORY ) );

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
  [ 'yamanashi', PoiYamanashi ],
  [ 'shizuoka', PoiShizuoka ],
  [ 'aichi', PoiAichi ],
  [ 'nagano', PoiNagano ],
  [ 'mie', PoiMie ],
  [ 'wakayama', PoiWakayama ],
  [ 'gifu', PoiGifu ],
  [ 'kyoto', PoiKyoto ],
  [ 'nara', PoiNara ],
  [ 'osaka', PoiOsaka ],
];

app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
  mkdirp( path.join( config.ROOT_DIRECTORY, config.SERVER_MAKE_DATA_CACHE_DIR ) )
  .then( () => Promise.all( CITIES.map( city => make_data( city ) ) ) )
  .then( jsons => {
    const merged = merge_jsons( jsons );
    res.send( merged );
    return write_city_json( config.SERVER_MAKE_DATA_FILENAME, merged );
  } )
  .then( () => Log.debug( 'MAKE DATA complete.' ) )
  .catch( ex => {
    Log.error( ex );
    res.status( 500 ).send( ex.message );
  } );
})

app.get( config.SERVER_URI, (req, res) =>
  fs.readFile( path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/${config.SERVER_MAKE_DATA_FILENAME}.json` ), 'utf8' )
    .then( data => res.send( JSON.parse( data ) ) )
    .catch( err => {
      Log.error( err );
      res.status( 500 ).send( {message: `get "${config.SERVER_MAKE_DATA_URI}" first!`} );
    } )
);

function restrictKey()
{
  const date = new Date();
  return `${config.SERVER_REDIS_RESTRICT_KEY}_${date.getFullYear()}_${date.getMonth()+1}`;
}

app.get( config.SERVER_AUTHORIZE_URI, (req, res) => {
  const url = process.env.MAPBOX_AT;
  if ( (url || '') === '' )
  {
    res.send( { token: process.env.REACT_APP_MapboxAccessToken } );
    return;
  }
  redis.incr( restrictKey() )
    .then( counter => {
      if ( counter > config.SERVER_RESTRICT_MAX )
      {
        res.status( config.SERVER_AUTHORIZE_ERRORCODE );
        return;
      }
      const date = new Date();
      date.setSeconds( date.getSeconds() + config.SERVER_AUTHORIZE_EXPIRE );
      axios.post( url, { expires: date.toISOString(), scopes: ["styles:read", "fonts:read"] } )
        .then( response => {
          res.send( { token: response.data.token } );
        } )
        .catch( err => {
          Log.error( err );
          res.status( 500 ).send( "MAPBOX NOT AUTHORIZED" );
        } )
    } );
} );

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
