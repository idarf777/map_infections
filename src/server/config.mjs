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
  const buildmode = process.env.NODE_ENV || 'development';
  if ( !process.env.REACT_APP_APPNAME )
  {
    let path = `${appRoot.path}/.env.${buildmode}`;
    if ( fs.existsSync( path + '.local' ) )
      path += '.local';
    dotenv.config( { path } );
  }
  const env = { ...process.env };
  //console.log( env );

  const is_debug = to_bool( env.REACT_APP_DEBUG );
  const DEFAULT_SERVER_PORT = 3001;
  const REDIS_ROOT = `covid19map_${buildmode}_`;
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
    MAP_STYLE: 'mapbox://styles/mapbox/light-v9',
    MAP_ZOOM: 6.5,
    MAP_PITCH: 40,  // [degree]
    MAP_BEARING: 0,
    MAP_CENTER: [136.63, 35.0], // [degree]
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
    ANIMATION_BEGIN_AT: 30, // [day] 現在から遡る日数
    MAP_CLICK_PROPAGATION_TIME: 500, // [msec] 子コンポーネントをクリックしてからDeckコンポーネントのonClickが発火するまでがこの時間以下なら無視する (e.stopPropagation()が効かない)
    MAP_PREFECTURE_ACTIVE_COLOR: [ 200, 100, 240, 128 ],
    MAP_SUMMARY_NATIONWIDE_NAME: { ja: '全国', zh: '全國', en: 'nationwide', ko: '전국' },
    MAP_SUMMARY_LOCALE_FALLBACK: 'en',
    MAP_CHART_AVERAGE_DAYS: 10,  // 移動平均の日数 [day] 奇数であること
    MAP_CHART_AVERAGE_NAME: { ja: '平均', zh: '平均', en: 'average', ko: '평균' },

    CREDIT_NAME: "© Shizentai Factory Co.",

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

    SERVER_REDIS_MAKE_DATA_BUSY_KEY: `${REDIS_ROOT}makedatabusy`,
    SERVER_MAKE_DATA_BUSY_EXPIRE: 300,  // [second]
    SERVER_REDIS_RESTRICT_KEY: `${REDIS_ROOT}restriction`,
    SERVER_RESTRICT_MAX: 30000,

    SERVER_MAKE_DATA_URI: `${SERVER_URI_PREFIX}/api/1.0/make_data`,
    SERVER_MAKE_DATA_DIR: 'json',
    SERVER_MAKE_DATA_CACHE_DIR: 'json/cache',
    SERVER_MAKE_DATA_FILENAME: 'infectors',

    DEPLOY_DIRECTORY: path.join( appRoot.path, 'dist' ),

    CITY_NAME_DATABASE: 'map_infectors_server.sqlite3',
    DATA_SINCE: new Date( '2020-01-01' ),
    TOKYO_CSV: {
      DATA_URI: 'https://raw.githubusercontent.com/idarf777/parse-tokyo-covid-report-pdf/master/csv/',
      DATA_BEGIN_AT: new Date( '2020-04-10' ),
      DATA_LACK_COUNT: 3,  // これ以上ファイルが欠けていたら終了とみなす
      LICENSE: license.MIT
    },  // 東京都はPDFでしか公開していない
    KANAGAWA_CSV: {
      DATA_URI: 'https://www.pref.kanagawa.jp/osirase/1369/data/csv/patient.csv',
      LICENSE: license.FREE
    },
    CHIBA_PDF: {
      INDEX_URI: 'https://www.pref.chiba.lg.jp/shippei/press/2019/ncov-index.html',
      LICENSE: license.FREE
    },  // PDFリンクをスクレイピングで探す
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
    GUNMA_CSV: {
      DATA_URI: 'http://stopcovid19.pref.gunma.jp/csv/01kanja.csv',
      LICENSE: license.MIT
    },
    HOKKAIDO_CSV: {
      DATA_URI: 'https://www.harp.lg.jp/opendata/dataset/1369/resource/3132/010006_hokkaido_covid19_patients.csv',
      LICENSE: license.CC
    },
    AOMORI_CSV: {
      INDEX_URI: 'https://opendata.pref.aomori.lg.jp/dataset/1531.html',
      LICENSE: license.CC
    },  // CSVリンクをスクレイピングで探す
    AKITA_HTML: {
      DATA_URI: 'https://www.pref.akita.lg.jp/pages/archive/47957',
      LICENSE: license.FREE
    },  // スクレイピングでデータを拾う
    YAMAGATA_CSV: {
      INDEX_URI: 'https://www.pref.yamagata.jp/090001/bosai/kochibou/kikikanri/covid19/shingata_corona.html',
      LICENSE: license.CC
    },  // CSVリンクをスクレイピングで探す
    IWATE_HTML: {
      DATA_URI: 'https://www.pref.iwate.jp/kurashikankyou/iryou/covid19/1029635/index.html',
      DATA2_URI: 'https://www.pref.iwate.jp/kurashikankyou/iryou/covid19/1034904/index.html',
      LICENSE: license.FREE
    },  // スクレイピングでデータを拾う
    MIYAGI_XLSX: {
      HTML_URI: 'https://www.pref.miyagi.jp/site/covid-19/02.html',
      LICENSE: license.FREE
    },  // URIをスクレイピングで探す
    FUKUSHIMA_HTML: {
      DATA_URI: 'https://www.pref.fukushima.lg.jp/sec/21045c/fukushima-hasseijyoukyou.html',
      LICENSE: license.FREE
    },
    NIIGATA_HTML: {
      DATA_URI: 'https://www.pref.niigata.lg.jp/site/shingata-corona/256362836.html',
      LICENSE: license.FREE
    },
    TOYAMA_HTML: {
      DATA_URI: 'http://www.pref.toyama.jp/cms_sec/1205/kj00021798.html',
      LICENSE: license.FREE
    },  // URIをスクレイピングで探す
    YAMANASHI_XLSX: {
      DATA_URI: 'https://www.pref.yamanashi.jp/koucho/coronavirus/documents/yousei.xlsx',
      HTML_URI: 'https://www.pref.yamanashi.jp/koucho/coronavirus/info_coronavirus_prevention.html',
      INDEX_URI: 'https://www.pref.yamanashi.jp/koucho/coronavirus/info_coronavirus_data.html',
      LICENSE: license.CC
    }, // 山梨県はなぜかデータが2系統ある
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
      DATA_URI: 'https://raw.githubusercontent.com/code4nagoya/covid19/development/data/patients.csv',
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
      INDEX_URI: 'https://stopcovid19.wakayama.jp/',
      LICENSE: license.CC
    }, // スクレイピングでJSのURLを拾う
    GIFU_CSV: {
      DATA_URI: 'https://gifu-opendata.pref.gifu.lg.jp/dataset/4661bf9d-6f75-43fb-9d59-f02eb84bb6e3/resource/9c35ee55-a140-4cd8-a266-a74edf60aa80/download/210005_gifu_covid19_patients.csv',
      LICENSE: license.CC
    },
    SHIGA_JSON: {
      DATA_URI: 'https://shiga-pref-org.github.io/covid19-data/data.json',
      LICENSE: license.CC
    }, // 滋賀県はCSV等のデータで提供しておらず、スクレイピングも面倒なのでデータは別サイトからもらう
    KYOTO_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/stopcovid19-kyoto/covid19/master/data/data.json',
      HTML_URI: 'https://www.pref.kyoto.jp/kentai/corona/hassei1-50.html',
      LICENSE: license.MIT
    },
    NARA_XLS: {
      DATA_URI: 'http://www.pref.nara.jp/secure/227193/%E5%A5%88%E8%89%AF%E7%9C%8C_01%E6%96%B0%E5%9E%8B%E3%82%B3%E3%83%AD%E3%83%8A%E3%82%A6%E3%82%A4%E3%83%AB%E3%82%B9%E6%84%9F%E6%9F%93%E8%80%85_%E6%82%A3%E8%80%85%E3%83%AA%E3%82%B9%E3%83%88.xlsx',
      LICENSE: license.FREE
    },
    OSAKA_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/codeforosaka/covid19/master/data/data.json',
      LICENSE: license.MIT
    }, // 大阪府はCSV等のデータで提供していない
    HYOGO_XLS: {
      INDEX_URI: 'https://web.pref.hyogo.lg.jp/kk03/corona_hasseijyokyo.html',
      LICENSE: license.FREE
    },
    
    // 北陸
    ISHIKAWA_CSV: {
      DATA_URI: 'https://www.pref.ishikawa.lg.jp/kansen/documents/170003_ishikawa_covid19_patients.csv',
      LICENSE: license.FREE
    },
    FUKUI_CSV: {
      DATA_URI: 'https://www.pref.fukui.lg.jp/doc/toukei-jouhou/covid-19_d/fil/covid19_patients.csv',
      LICENSE: license.CC
    },

    // 中国
    YAMAGUCHI_CSV: {
      DATA_URI: 'https://yamaguchi-opendata.jp/ckan/dataset/f6e5cff9-ae43-4cd9-a398-085187277edf/resource/f56e6552-4c5d-4ec6-91c0-090f553e0aea/download/',
      LICENSE: license.CC // https://creativecommons.org/licenses/by/4.0/deed.ja 
    },
    HIROSHIMA_HTML: {
      DATA_URI: 'https://www.pref.hiroshima.lg.jp/site/hcdc/covid19-kanjya.html',
      LICENSE: license.FREE
    },
    OKAYAMA_CSV: {
      DATA_URI: 'http://www.okayama-opendata.jp/ckan/dataset/e6b3c1d2-2f1f-4735-b36e-e45d36d94761/resource/c6503ebc-b2e9-414c-aae7-7374f4801e21/download/kansenshashousaijouhou0420.csv',
      LICENSE: license.CC // CC のリンク先無
    },
    SHIMANE_HTML: {
      DATA_URI: 'https://shimane-covid19.com/',
      LICENSE: license.FREE
    },
    TOTTORI_HTML: {
      DATA_URI: 'https://www.pref.tottori.lg.jp/291425.htm',
      LICENSE: license.FREE
    },

    // 四国
    TOKUSHIMA_PDF: {
      INDEX_URI: 'https://www.pref.tokushima.lg.jp/jigyoshanokata/kenko/kansensho/5042728/',
      LICENSE: license.FREE
    },
    KAGAWA_HTML: {
      DATA_URI: 'https://www.pref.kagawa.lg.jp/content/etc/subsite/kansenshoujouhou/kansen/se9si9200517102553.shtml',
      LICENSE: license.FREE
    },
    KOCHI_CSV: {
      DATA_URI: 'https://www.pref.kochi.lg.jp/soshiki/111301/files/2020041300141/390003_kochi_covid19_patients.csv',
      LICENSE: license.FREE
    },
    EHIME_CSV: {
      INDEX_URI: 'https://www.pref.ehime.jp/opendata-catalog/dataset/2174.html',
      LICENSE: license.CC
    }, // スクレイピングでURIを拾う
    
    // 九州
    FUKUOKA_CSV: {
      DATA_URI: 'https://ckan.open-governmentdata.org/dataset/8a9688c2-7b9f-4347-ad6e-de3b339ef740/resource/c27769a2-8634-47aa-9714-7e21c4038dd4/download/400009_pref_fukuoka_covid19_patients.csv',
      LICENSE: license.CC
    },
    NAGASAKI_HTML: {
      DATA_URI: 'https://data.bodik.jp/dataset/420000_covidpatients/resource/de7ce61e-1849-47a1-b758-bca3f809cdf8',
      LICENSE: license.CC
    },
    SAGA_HTML: {
      DATA_URI: 'https://www.pref.saga.lg.jp/kiji00373220/index.html',
      LICENSE: license.FREE
    },
    OHITA_CSV: {
      DATA_URI: 'https://data.bodik.jp/dataset/f632f467-716c-46aa-8838-0d535f98b291/resource/3714d264-70f3-4518-a57a-8391e0851d7d/download/440001oitacovid19patients.csv',
      LICENSE: license.CC
    },
    KUMAMOTO_JSON: {
      DATA_URI: 'https://raw.githubusercontent.com/codeforkumamoto/covid19/master/data/data.json',
      LICENSE: license.MIT
    }, 
    MIYAZAKI_HTML: {
      DATA_URI: 'https://www.pref.miyazaki.lg.jp/kansensho-taisaku/covid-19/hassei_list.html',
      LICENSE: license.FREE
    },
    KAGOSHIMA_HTML: {
      DATA_URI: 'https://www.pref.kagoshima.jp/ae06/kenko-fukushi/kenko-iryo/kansen/kansensho/coronavirus.html',
      LICENSE: license.FREE
    },
    OKINAWA_HTML: {
      DATA_URI: 'https://okinawa.stopcovid19.jp/cards/attributes-of-confirmed-cases/',
      LICENSE: license.CC
    },
  } );

}

