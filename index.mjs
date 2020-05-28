import express from 'express';
import ejs from 'ejs';
import { AppLogger as log } from './logger.mjs';
import { app_config as config } from './config.mjs'

const APP_PORT = 3000;

const app = express();
app.set( 'view engine', 'ejs' );
app.use('', express.static( `${config.ROOTDIR}/public` ) );
app.get( '/', ( req, res ) => {
  res.render( `${config.VIEWDIR}/index.ejs`, { accessToken: config.MAPBOX_TOKEN } );
});

const server = app.listen( APP_PORT, ( ex ) => {
  if ( ex )
  {
    log.error( `ERROR: PORT ${server.address().port} is in use now` );
    return;
  }
  log.info( `Now listening PORT ${server.address().port}` );
} );

