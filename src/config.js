import { to_bool } from "./util.js";
import dotenv from 'dotenv';
dotenv.config();
const __dirname = process.cwd();

const is_debug = to_bool( process.env.REACT_APP_DEBUG );

export const loglevel = Object.freeze( {
  EVERY: 0,
  VERBOSE: 0,
  DEBUG: 1,
  INFO: 2,
  ERROR: 3
} );
export const config = Object.freeze( {
  DEBUG: is_debug,
  LOGLEVEL: process.env.REACT_APP_LOGLEVEL || loglevel.INFO,
  ROOT_DIRECTORY: __dirname,
  MAX_INFECTORS: 100,
  MAP_STYLE: 'mapbox://styles/mapbox/light-v10',
  MAP_ZOOM: 10,
  MAP_PITCH: 40,  // [degree]
  MAP_BEARING: 0,
  MAP_CENTER: [138.6728926, 35.1637692], // [degree]
  MAP_ELEVATION: 5000,  // [m]
  MAP_COLORRANGE: [
    [1, 152, 189],
    [73, 227, 206],
    [216, 254, 181],
    [254, 237, 177],
    [254, 173, 84],
    [209, 55, 78]
  ],
  MAP_COVERAGE: 1.0,
  MAP_UPPERPERCENTILE: 100,
  MAP_POI_RADIUS: 500,  // [m]
  ANIMATION_TIME_RESOLUTION: 100, // [msec]
  ANIMATION_SPEED: 1000, // [msec] msec/day

  STANDALONE: to_bool( process.env.REACT_APP_STANDALONE ) || false,
  SERVER_PORT: is_debug ? 3001 : 80,
  SERVER_URI: '/api/1.0/infectors',
  SERVER_HOST: 'http://localhost',
  SERVER_ALLOW_FROM_ALL: to_bool( process.env.REACT_APP_SERVER_ALLOW_FROM_ALL ) || false,

  SERVER_MAKE_DATA_URI: '/api/1.0/make_data',
  TOKYO_CSV_DATA_URI: 'https://raw.githubusercontent.com/smatsumt/parse-tokyo-covid-report-pdf/master/csv/',
  TOKYO_CSV_DATA_BEGIN_AT: new Date(), //new Date( '2020-04-10' ),
  TOKYO_CSV_DATA_LACK_COUNT: 3  // これ以上ファイルが欠けていたら終了とみなす

} );

