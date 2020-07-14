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
// CSRFは後の課題とする
import load_tokyo_poi from './poi_tokyo.js';
import load_kanagawa_poi from './poi_kanagawa.js';
import { datetostring } from "../util.js";
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


app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
  Log.debug( "MAKE_DATA" );
  mkdirp( path.join( config.ROOT_DIRECTORY, config.SERVER_MAKE_DATA_CACHE_DIR ) )
   .then( made => load_tokyo_poi() )
  // .then( data => {
  //   Log.debug( data );
  //   res.send( data );
  //   return fs.writeFile( path.join( config.ROOT_DIRECTORY, 'json/tokyo.json' ), JSON.stringify( data ), 'utf8' );
  // } )
  //.then( () => load_kanagawa_poi() )
  .then( data => {
    Log.debug( data );
    res.send( data );
    return fs.writeFile( path.join( config.ROOT_DIRECTORY, 'json/kanagawa.json' ), JSON.stringify( data ), 'utf8' );
  } )
  .catch( ex => {
    Log.error( ex );
    res.status( 500 );
  } );
})

function merge_jsons( jsons )
{
  let spots = [];
  jsons.forEach( json => {
    spots = spots.concat( json );
  } );
  return {
    begin_at: datetostring( jsons.map( json => new Date( json.begin_at ).getTime() ).sort()[ 0 ] ),
    finish_at: datetostring( jsons.map( json => new Date( json.finish_at ).getTime() ).sort().reverse()[ 0 ] ),
    spots: spots
  };
}

app.get( config.SERVER_URI, (req, res) => {
  const jsons = [];
  fs.readFile( path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/tokyo.json` ), 'utf8' )
    .then( data => {
      jsons.push( JSON.parse( data ) );
      return fs.readFile( path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_DIR}/kanagawa.json` ), 'utf8' );
    } )
    .then( data => {
      jsons.push( JSON.parse( data ) );
      res.send( merge_jsons( jsons ) );
    } )
    .catch( err => {
      Log.error( err );
      res.status( 500 );
      res.send( {message: `get "${config.SERVER_MAKE_DATA_URI}" first!`} );
    } );
} );

app.get('*', function (req, res) {
  res.sendFile(path.join(config.ROOT_DIRECTORY, 'dist', 'index.html'))
})

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
