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
  DEBUG: is_debug,
  LOGLEVEL: process.env.COLLISION_LOGLEVEL || app_loglevel.INFO,
  ROOTDIR: __dirname,
  VIEWDIR: `${__dirname}/views`,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN
} );

