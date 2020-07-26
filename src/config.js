import { to_bool } from "./util.js";
import dotenv from 'dotenv';
dotenv.config();
const __dirname = process.cwd();

const is_debug = to_bool( process.env.REACT_APP_DEBUG );

export const license = Object.freeze( {
  MIT: 'MIT',
  APACHE: 'Apache',
  GPL1: 'GPLv1',
  GPL2: 'GPLv2',
  GPL3: 'GPLv3',
  LGPL1: 'LGPLv1',
  LGPL2: 'LGPLv2',
  LGPL2_1: 'LGPLv2.1',
  LGPL3: 'LGPLv3',
  BSD: 'BSD',
  CC: 'Creative Commons',
  FREE: 'Free'
} );
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
  MAX_INFECTORS_COLOR: 70,
  MAP_STYLE: 'mapbox://styles/mapbox/light-v10',
  MAP_ZOOM: 7.2,
  MAP_PITCH: 40,  // [degree]
  MAP_BEARING: 0,
  MAP_CENTER: [138.848263, 35.677912], // [degree]
  //MAP_CENTER: [138.6728926, 35.1637692], // [degree]
  MAP_ELEVATION: 150000,  // [m]
  MAP_COLORRANGE: [
    [1, 152, 189],    // 0のとき
    [73, 227, 206],   // 1以上
    [216, 254, 181],
    [254, 237, 177],
    [254, 173, 84],
    [209, 55, 78]
  ],
  MAP_COVERAGE: 1.0,
  MAP_UPPERPERCENTILE: 100,
  MAP_POI_RADIUS: 3000,  // [m]
  ANIMATION_TIME_RESOLUTION: 100, // [msec]
  ANIMATION_SPEED: 500, // [msec] msec/day
  TOOLTIPS_CURSOR_OFFSET: 20,

  STANDALONE: to_bool( process.env.REACT_APP_STANDALONE ) || false,
  SERVER_PORT: is_debug ? 3001 : 80,
  SERVER_URI: '/api/1.0/infectors',
  SERVER_HOST: 'http://localhost',
  SERVER_ALLOW_FROM_ALL: to_bool( process.env.REACT_APP_SERVER_ALLOW_FROM_ALL ) || false,

  SERVER_MAKE_DATA_URI: '/api/1.0/make_data',
  SERVER_MAKE_DATA_DIR: 'json',
  SERVER_MAKE_DATA_CACHE_DIR: 'json/cache',
  SERVER_MAKE_DATA_FILENAME: 'infectors',

  CITY_NAME_DATABASE: 'map_infectors_server.sqlite3',

  TOKYO_CSV: {
    DATA_URI: 'https://raw.githubusercontent.com/smatsumt/parse-tokyo-covid-report-pdf/master/csv/',
    DATA_BEGIN_AT: new Date( '2020-04-10' ),
    DATA_LACK_COUNT: 3,  // これ以上ファイルが欠けていたら終了とみなす
    LICENSE: license.MIT
  },
  KANAGAWA_CSV: {
    DATA_URI: 'https://www.pref.kanagawa.jp/osirase/1369/data/csv/patient.csv',
    LICENSE: license.FREE
  },
  CHIBA_XLS: {
    DATA_URI: 'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seisaku/covid-19/documents/01patient.xlsx',
    LICENSE: license.FREE
  },
  SAITAMA_CSV: {
    DATA_URI: 'https://opendata.pref.saitama.lg.jp/data/dataset/c3a8db28-b943-4fcc-82ec-b7febd460bec/resource/',
    INDEX_URI: 'https://opendata.pref.saitama.lg.jp/data/dataset/covid19-jokyo',
    SEARCH_KEY: '<a href="https://opendata.pref.saitama.lg.jp/data/dataset/c3a8db28-b943-4fcc-82ec-b7febd460bec/resource/',
    LICENSE: license.FREE
  },
  YAMANASHI_XLS: {
    DATA_URI: 'https://www.pref.yamanashi.jp/koucho/coronavirus/documents/youseisha.xlsx',
    LICENSE: license.FREE
  },
  SHIZUOKA_CSV: {
    DATA_URI: 'https://opendata.pref.shizuoka.jp/dataset/8167/resource/46279/220001_shizuoka_covid19_patients.csv',
    LICENSE: license.CC,
    SHIZUOKA_CITY_CSV: {
      // 静岡市
      DATA_URI: 'https://www.city.shizuoka.lg.jp/388_000109.html',
      LICENSE: license.CC
      // 保留
    },
  },
  AICHI_CSV: {
    DATA_URI: 'https://raw.githubusercontent.com/code4nagoya/covid19/master/data/patients.csv',
    LICENSE: license.MIT
  },
  NAGANO_CSV: {
    DATA_URI: 'https://www.pref.nagano.lg.jp/hoken-shippei/kenko/kenko/kansensho/joho/documents/200000_nagano_covid19_patients.csv',
    LICENSE: license.CC
  },
  MIE_CSV: {
    DATA_URI: 'https://www.pref.mie.lg.jp/common/content/000896797.csv',
    LICENSE: license.CC
  },
} );

