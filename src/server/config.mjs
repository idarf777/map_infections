import { to_bool } from "./util.mjs";
import dotenv from 'dotenv';
//import process from 'process';
import appRoot from 'app-root-path';
import fs from 'fs';

export const LOGLEVEL = Object.freeze( {
  EVERY: 0,
  VERBOSE: 0,
  DEBUG: 1,
  INFO: 2,
  ERROR: 3
} );
export default function makeConfig()
{
  if ( !process.env.REACT_APP_APPNAME )
  {
    let path = `${appRoot.path}/.env.${process.env.NODE_ENV || 'development'}`;
    if ( fs.statSync( path + '.local' ) )
      path += '.local';
    dotenv.config( { path } );
  }
  const env = { ...process.env };
  //console.log( env );

  const is_debug = to_bool( env.REACT_APP_DEBUG );
  const DEFAULT_SERVER_PORT = 3001;
  const REDIS_ROOT = 'covid19map_';
  const SERVER_URI_PREFIX = env.REACT_APP_SERVER_URI_PREFIX || '';

  const license = Object.freeze( {
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

  return Object.freeze( {
    DEBUG: is_debug,
    LOGLEVEL: env.REACT_APP_LOGLEVEL || LOGLEVEL.INFO,
    ROOT_DIRECTORY: appRoot.path,  // Reactでは使えない
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
    ANIMATION_BEGIN_AT: new Date( '2020-04-10' ),

    STANDALONE: to_bool( env.REACT_APP_STANDALONE ) || false,
    SERVER_PORT: env.REACT_APP_SERVER_PORT || DEFAULT_SERVER_PORT,
    SERVER_HOST: `${env.REACT_APP_SERVER_HOST}:${env.REACT_APP_SERVER_PORT || DEFAULT_SERVER_PORT}` || `http://localhost:${env.REACT_APP_SERVER_PORT || DEFAULT_SERVER_PORT}`,
    SERVER_ALLOW_FROM_ALL: to_bool( env.REACT_APP_SERVER_ALLOW_FROM_ALL ) || false,

    SERVER_URI_PREFIX: SERVER_URI_PREFIX,
    SERVER_URI: `${SERVER_URI_PREFIX}/api/1.0/infectors`,
    SERVER_RESTRICT_URI: `${SERVER_URI_PREFIX}/api/1.0/restriction`,
    SERVER_REDIS_RESTRICT_KEY: `${REDIS_ROOT}restriction`,
    SERVER_RESTRICT_MAX: 30000,

    SERVER_MAKE_DATA_URI: `${SERVER_URI_PREFIX}/api/1.0/make_data`,
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
      DATA_URI: 'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seisaku/covid-19/documents/01patient.xlsx', // 千葉県のデータは居住地なし
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
    NAGANO_HTML: {
      DATA_URI: 'https://www.pref.nagano.lg.jp/hoken-shippei/kenko/kenko/kansensho/joho/corona-doko.html',
      LICENSE: license.CC
    },
    MIE_CSV: {
      DATA_URI: 'https://www.pref.mie.lg.jp/common/content/000896797.csv',
      LICENSE: license.CC
    },
    WAKAYAMA_CSV: {
      DATA_URI: 'https://raw.githubusercontent.com/wakayama-pref-org/covid19/master/csv/kansensuii.csv',
      LICENSE: license.CC
    },
    GIFU_CSV: {
      DATA_URI: 'https://data.gifu-opendata.pref.gifu.lg.jp/dataset/4661bf9d-6f75-43fb-9d59-f02eb84bb6e3/resource/9c35ee55-a140-4cd8-a266-a74edf60aa80/download/210005gifucovid19patients.csv',
      LICENSE: license.CC
    },
    // 滋賀県はかなり面倒なので後まわし
    KYOTO_HTML: {
      DATA_URI: 'https://www.pref.kyoto.jp/kentai/corona/hassei1-50.html',
      LICENSE: license.FREE
    },
    NARA_XLS: {
      DATA_URI: 'http://www.pref.nara.jp/secure/227193/%E5%A5%88%E8%89%AF%E7%9C%8C_01%E6%96%B0%E5%9E%8B%E3%82%B3%E3%83%AD%E3%83%8A%E3%82%A6%E3%82%A4%E3%83%AB%E3%82%B9%E6%84%9F%E6%9F%93%E8%80%85_%E6%82%A3%E8%80%85%E3%83%AA%E3%82%B9%E3%83%88.xlsx',
      LICENSE: license.FREE
    },
    OSAKA_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/codeforosaka/covid19/development/data/data.json',
      LICENSE: license.MIT
    },
  } );

}

