import dotenv, {load} from 'dotenv';
import agh from 'agh.sprintf';
import { config } from '../config.js';
import Log from '../logger.js';
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
// CSRFは後の課題とする
import load_tokyo_poi from './poi_tokyo.js';
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
  //res.send( {message: 'OK'} );
  load_tokyo_poi().then( data => {
    Log.debug( data );
    const ws = fs.createWriteStream( path.join( config.ROOT_DIRECTORY, 'json/tokyo.json' ), 'utf8' );
    ws.write( JSON.stringify( data ) );
    ws.end();
    res.send( data );
  } )
  .catch( ex => {
    Log.error( ex );
    res.status( 500 );
  } );
})

app.get( config.SERVER_URI, (req, res) => {
  fs.readFile( path.join( config.ROOT_DIRECTORY, 'json/tokyo.json' ), 'utf8', (err, data) => {
    if ( err )
    {
      Log.error( err );
      res.status( 500 );
      res.send( {message: `get "${config.SERVER_MAKE_DATA_URI}" first!`} );
    }
    else
    {
      res.send( data );
    }
  } );
})

app.get('*', function (req, res) {
  res.sendFile(path.join(config.ROOT_DIRECTORY, 'dist', 'index.html'))
})

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
