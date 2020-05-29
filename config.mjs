import { to_bool } from "./util.mjs";
const __dirname = process.cwd();

const is_debug = to_bool( process.env.COLLISION_DEBUG );

export const app_loglevel = Object.freeze( {
  EVERY: 0,
  VERBOSE: 0,
  DEBUG: 1,
  INFO: 2,
  ERROR: 3
} );
export const app_config = Object.freeze( {
  DEBUG: is_debug || false,
  LOGLEVEL: process.env.COLLISION_LOGLEVEL || app_loglevel.INFO,
  ROOTDIR: __dirname,
  VIEWDIR: `${__dirname}/views`,
  CSVDIR: `${__dirname}/csv`,
  DATABASE_PATH: `${__dirname}/citypos.sqlite3`,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  DATE_BEGIN: new Date( '2020-02-01 00:00:00 +0900' ).getTime(),  // == 1580482800000
  DATE_PERIOD_MSEC: 24*60*60*1000 // [msec] == 86400000
} );

