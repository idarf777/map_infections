import express from 'express';
import ejs from 'ejs';
import { AppLogger as log } from './logger.mjs';
import { app_config as config } from './config.mjs'
import DbSrc from './db_src.mjs';
import City from './city.mjs';
import Infector from './infector.mjs';

const APP_PORT = 3000;

const db = new DbSrc( config.DATABASE_PATH );
const app = express();
app.set( 'view engine', 'ejs' );
app.use('', express.static( `${config.ROOTDIR}/public` ) );
app.get( '/', ( req, res ) => {

  new City( db )
    .set_condition( 'city_cd BETWEEN 13000 AND 13999' )  // 東京都のみ
    .get()
    .then( r => {
      const cds = r.result.map( city => city.city_cd )
      return new Infector( db )
        .set_condition( `city_cd IN (${cds.join( ',' )})` )
        .set_order( 'timestamp' )
        .set_extra( r.result )
        .get();
    } )
    .then( r => {
      const tb = r.result[ 0 ].timestamp;
      const te = r.result[ r.result.length-1 ].timestamp;
      const n_days = (te - tb)/config.DATE_PERIOD_MSEC + 1;
      res.render( `${config.VIEWDIR}/index.ejs`, { app_config: config, n_days: n_days, infectors: r.result, cities: r.instance.get_extra() } );
    } )
    .catch( ( ex ) => {
      log.error( `ERROR: ${ex}` );
    } );
});

const server = app.listen( APP_PORT, ( ex ) => {
  if ( ex )
  {
    log.error( `ERROR: PORT ${server.address().port} is in use now` );
    return;
  }
  log.info( `Now listening PORT ${server.address().port}` );
} );

