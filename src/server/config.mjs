import { to_bool } from "./util.mjs";
import dotenv from 'dotenv';
//import process from 'process';
import appRoot from 'app-root-path';
import fs from 'fs';
import path from 'path';

export const LOGLEVEL = Object.freeze( {
  EVERY: 0,
  VERBOSE: 0,
  DEBUG: 1,
  INFO: 2,
  ERROR: 3,
  NONE: 100
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
    LOGLEVEL: (env.REACT_APP_LOGLEVEL != null) ? Number(env.REACT_APP_LOGLEVEL) : LOGLEVEL.INFO,
    ROOT_DIRECTORY: appRoot.path,  // Reactでは使えない
    MAX_INFECTORS: 100,
    MAX_INFECTORS_COLOR: 70,
    MAP_STYLE: 'mapbox://styles/mapbox/light-v10',
    MAP_ZOOM: 7.2,
    MAP_PITCH: 40,  // [degree]
    MAP_BEARING: 0,
    MAP_CENTER: [138.0, 35.4], // [degree]
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

    COOKIE_MAP_TOKEN: 'mbt',
    COOKIE_EXPIRE_DATE: 'edt',
    COOKIE_EXPIRE: 900,

    STANDALONE: to_bool( env.REACT_APP_STANDALONE ) || false,
    SERVER_PORT: env.REACT_APP_SERVER_PORT || DEFAULT_SERVER_PORT,
    SERVER_HOST: env.REACT_APP_SERVER_HOST,
    SERVER_ALLOW_FROM_ALL: to_bool( env.REACT_APP_SERVER_ALLOW_FROM_ALL ) || false,

    SERVER_URI_PREFIX: SERVER_URI_PREFIX,
    SERVER_URI: `${SERVER_URI_PREFIX}/api/1.0/infectors`,
    SERVER_AUTHORIZE_URI: `${SERVER_URI_PREFIX}/api/1.0/auth`,
    SERVER_AUTHORIZE_EXPIRE: 1800,  // [second]

    SERVER_REDIS_RESTRICT_KEY: `${REDIS_ROOT}restriction`,
    SERVER_RESTRICT_MAX: 30000,

    SERVER_MAKE_DATA_URI: `${SERVER_URI_PREFIX}/api/1.0/make_data`,
    SERVER_MAKE_DATA_DIR: 'json',
    SERVER_MAKE_DATA_CACHE_DIR: 'json/cache',
    SERVER_MAKE_DATA_FILENAME: 'infectors',

    DEPLOY_DIRECTORY: path.join( appRoot.path, 'dist' ),

    CITY_NAME_DATABASE: 'map_infectors_server.sqlite3',

    TOKYO_CSV: {
      DATA_URI: 'https://raw.githubusercontent.com/smatsumt/parse-tokyo-covid-report-pdf/master/csv/',
      DATA_BEGIN_AT: new Date( '2020-04-10' ),
      DATA_LACK_COUNT: 3,  // これ以上ファイルが欠けていたら終了とみなす
      LICENSE: license.MIT
    },  // 東京都はPDFでしか公開していない
    KANAGAWA_CSV: {
      DATA_URI: 'https://www.pref.kanagawa.jp/osirase/1369/data/csv/patient.csv',
      LICENSE: license.FREE
    },
    CHIBA_XLS: {
      DATA_URI: 'https://www.city.chiba.jp/hokenfukushi/iryoeisei/seisaku/covid-19/documents/01patient.xlsx', // 千葉県のデータは居住地なし
      LICENSE: license.FREE
    },  // 千葉県は市区町村単位のデータを公開していない
    SAITAMA_CSV: {
      INDEX_URI: 'https://opendata.pref.saitama.lg.jp/data/dataset/covid19-jokyo',
      LICENSE: license.FREE
    },  // CSVリンクをスクレイピングで探す
    IBARAKI_HTML: {
      DATA_URI: 'https://www.pref.ibaraki.jp/1saigai/2019-ncov/ichiran.html',
      LICENSE: license.FREE
    },  // スクレイピングでデータを拾う
    TOCHIGI_HTML: {
      DATA_URI: 'http://www.pref.tochigi.lg.jp/e04/welfare/hoken-eisei/kansen/hp/coronakensahasseijyoukyou.html',
      LICENSE: license.FREE
    },  // URIをスクレイピングで探す
    YAMANASHI_XLS: {
      DATA_URI: 'https://www.pref.yamanashi.jp/koucho/coronavirus/documents/youseisha.xlsx',
      LICENSE: license.FREE
    }, // 山梨県は2020/6/14からデータを更新していない
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
    }, // スクレイピングでデータを拾う
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
    // 滋賀県はCSV等のデータで提供しておらず、スクレイピングする必要があるが、ページをまたがっていてかなり面倒なので後まわし
    KYOTO_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/stopcovid19-kyoto/covid19/master/data/data.json',
      HTML_URI: 'https://www.pref.kyoto.jp/kentai/corona/hassei1-50.html',
      LICENSE: license.MIT
    }, // 京都府はスクレイピングしても過去の新規感染者の日付が追えない
    NARA_XLS: {
      DATA_URI: 'http://www.pref.nara.jp/secure/227193/%E5%A5%88%E8%89%AF%E7%9C%8C_01%E6%96%B0%E5%9E%8B%E3%82%B3%E3%83%AD%E3%83%8A%E3%82%A6%E3%82%A4%E3%83%AB%E3%82%B9%E6%84%9F%E6%9F%93%E8%80%85_%E6%82%A3%E8%80%85%E3%83%AA%E3%82%B9%E3%83%88.xlsx',
      LICENSE: license.FREE
    },
    OSAKA_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/codeforosaka/covid19/master/data/data.json',
      LICENSE: license.MIT
    }, // 大阪府はCSV等のデータで提供していない
    // 北陸
    ISHIKAWA_CSV: {
      DATA_URI: 'https://www.pref.ishikawa.lg.jp/kansen/documents/170003_ishikawa_covid19_patients.csv',
      LICENSE: license.FREE
    },

    // 四国
    TOKUSHIMA_HTML: {
      DATA_URI: 'https://www.pref.tokushima.lg.jp/ippannokata/kenko/kansensho/5034012#20',
      LICENSE: license.FREE
    },
    KAGAWA_HTML: {
      DATA_URI: 'https://www.pref.kagawa.lg.jp/content/etc/subsite/kansenshoujouhou/kansen/se9si9200517102553.shtml',
      LICENSE: license.FREE
    },
    KOCHI_CSV: {
      DATA_URI: 'https://www.pref.kochi.lg.jp/soshiki/111301/files/2020041300141/390003_kochi_covid19_patients.csv',
      LICENSE: license.CC
    },
    EHIME_CSV: {
      DATA_URI: 'https://www.pref.ehime.jp/opendata-catalog/dataset/2174/resource/7057/380008_ehime_covid19_patients.csv',
      LICENSE: license.CC
    },

    // 九州
    EHIME_CSV: {
      DATA_URI: 'https://ckan.open-governmentdata.org/dataset/8a9688c2-7b9f-4347-ad6e-de3b339ef740/resource/c27769a2-8634-47aa-9714-7e21c4038dd4/download/400009_pref_fukuoka_covid19_patients.csv',
      LICENSE: license.CC
    },

  } );

}

