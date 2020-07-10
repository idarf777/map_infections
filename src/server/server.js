import dotenv, {load} from 'dotenv';
import agh from 'agh.sprintf';
import { config } from '../config.js';
import Log from '../logger.js';
import express from 'express';
import axios from 'axios';
import path from 'path';
import helmet from 'helmet';
// CSRFは後の課題とする
import { example_data } from "../example_data.js";

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

async function load_tokyo_csv( date )
{
  const uri = agh.sprintf( `${config.TOKYO_CSV_DATA_URI}%04d%02d%02d.csv`, date.getFullYear(), date.getMonth()+1, date.getDate() );
  Log.debug( `trying GET ${uri} ...` );
  return axios.get( uri );
}
async function load_tokyo_csv_all()
{
  // TOKYO_CSV_DATA_BEGIN_AT以降の取得可能なCSVをすべて取得する
  const csvs = new Map();
  let lastdate = null;
  let firstcsv = null;
  for ( let date = new Date( config.TOKYO_CSV_DATA_BEGIN_AT ), lacks = 0;  lacks < config.TOKYO_CSV_DATA_LACK_COUNT;  date.setDate( date.getDate()+1 ) )
  {
    const response = await load_tokyo_csv( date ).catch( () => null );
    Log.debug( `response : ${response}` );
    if ( response?.data )
    {
      csvs.set( date.getTime(), response.data );
      lastdate = new Date( date );
      firstcsv ||= response.data;
      lacks = 0;
      continue;
    }
    lacks++;
  }
  // 日付が欠けているところをその前日のCSVで補う
  for ( let date = config.TOKYO_CSV_DATA_BEGIN_AT; lastdate && (date.getTime() <= lastdate.getTime());  date.setDate( date.getDate()+1 ) )
  {
    if ( csvs.has( date.getTime() ) )
      continue;
    const prevdate = new Date( date );
    prevdate.setDate( prevdate.getDate() - 1 );
    csvs.set( date.getTime(), csvs.get( prevdate.getTime() ) || firstcsv );
  }
  return csvs;
}

app.get( config.SERVER_MAKE_DATA_URI, (req, res) => {
  Log.debug( "MAKE_DATA" );
  //res.send( {message: 'OK'} );
  load_tokyo_csv_all().then( csvs => {
    //Log.debug( Array.from( csvs.keys() ).map( k => new Date( k ) ) );




    res.send( {message: 'OK'} );
  } )
  .catch( ex => {
    Log.error( ex );
    res.status( 500 );
  } );
})

app.get( config.SERVER_URI, (req, res) => {
  res.send( example_data );
})

app.get('*', function (req, res) {
  res.sendFile(path.join(config.ROOT_DIRECTORY, 'dist', 'index.html'))
})

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
