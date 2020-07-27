import dotenv, {load} from 'dotenv';
import agh from 'agh.sprintf';
import { config } from '../config.js';
import Log from '../logger.js';
import express from 'express';
import axios from 'axios';
import mkdirp from 'mkdirp';
import { promises as fs } from "fs";
import path from 'path';
import helmet from 'helmet';
import { datetostring } from "../util.js";
// CSRFは後の課題とする
import PoiTokyo from './poi_tokyo.js';
import PoiKanagawa from './poi_kanagawa.js';
import PoiChiba from "./poi_chiba.js";
import PoiSaitama from "./poi_saitama.js";
import PoiYamanashi from "./poi_yamanashi.js";
import PoiShizuoka from "./poi_shizuoka.js";
import PoiAichi from "./poi_aichi.js";
import PoiNagano from "./poi_nagano.js";
import PoiMie from "./poi_mie.js";
import PoiWakayama from "./poi_wakayama.js";
import PoiGifu from "./poi_gifu.js";
import PoiKyoto from "./poi_kyoto.js";
import PoiNara from "./poi_nara.js";
import PoiOsaka from "./poi_osaka.js";
//import { example_data } from '../example_data.js';

dotenv.config();

const app = express();
app.use(express.static(path.join(config.ROOT_DIRECTORY, 'dist')));
app.use( helmet.xssFilter() );
if ( config.DEBUG || config.SERVER_ALLOW_FROM_ALL )
{
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", config.SERVER_ALLOW_FROM_ALL ? '*' : "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}

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
    res.status( 500 );
  } );
})

app.get( config.SERVER_URI, (req, res) =>
  fs.readFile( path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/${config.SERVER_MAKE_DATA_FILENAME}.json` ), 'utf8' )
    .then( data => res.send( JSON.parse( data ) ) )
    .catch( err => {
      Log.error( err );
      res.status( 500 );
      res.send( {message: `get "${config.SERVER_MAKE_DATA_URI}" first!`} );
    } )
);

app.get( '*', (req, res) => res.sendFile(path.join(config.ROOT_DIRECTORY, 'dist', 'index.html') ) );

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
