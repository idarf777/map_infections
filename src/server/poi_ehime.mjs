import BasePoi from "./base_poi.mjs";
import jsdom from "jsdom";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import {axios_instance, parse_csv} from "./util.mjs";
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  //['その他', ''],
  ['東予地域', '四国中央市'],
  ['中予地域', '伊予市'],
  ['西予地域', '西予市'],
  //['非公表', ''],
];

// HTTP(S)のURIを補完する
function complement_uri( uri )
{
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.EHIME_CSV.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return uri;
}

// linkタグのJSを全て読んでデータを探す
async function parse_html( html )
{
  const dom = new JSDOM( html );
  for ( const tag of dom.window.document.getElementsByClassName( 'download' ) )
  {
    if ( !tag.href.match( /ehime_covid19_patients\.csv$/ ) )
      continue;
    const uri = complement_uri( tag.href );
    Log.info( `loading ${uri}...` );
    const cr = await axios_instance({ responseType: 'arraybuffer' }).get( uri );
    return parse_csv( iconv.decode( cr.data, 'UTF8' ) );
  }
  throw new Error( "no valid data on ehime-pref" );
}

export default class PoiEhime extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '愛媛県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.EHIME_CSV.INDEX_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
      row_begin: 1,
      min_columns: 8,
      col_date: 4,
      col_city: 7
    } );
  }
}
