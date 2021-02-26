import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import {axios_instance} from "./util.mjs";
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['乙訓保健所管内', '長岡京市'],
  ['乙訓管内', '長岡京市'],
  ['山城管内', '宇治市'],
  ['丹後管内', '京丹後市'],
  ['南丹管内', '亀岡市'],
  ['中丹管内', '福知山市'],
  ['管内', ''],
  ['府内', ''],
  ['京都府内', ''],
  ['京都市内', '京都市']
];

function parse_html( html )
{
  const csv = [];
  //                          通し番号                   日付                    年齢                      性別                      居住地
  const re = /<tr>[\s\S]*?<td>(\d+)例目<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>(.*?)<\/td>/g;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const date = m[ 2 ];
    const city = m[ 3 ];
    const dm = date.trim().match( /^(.+?)(\d+)年(\d+)月(\d+)日$/ );
    if ( !dm || dm[ 1 ] !== '令和' )
      continue;
    const d = new Date( parseInt( dm[ 2 ] ) + 2018, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) );
    csv.push( [ d, city ] );
  }
  return csv;
}
function complement_uri( uri )
{
  const prefix = uri.match( /^https?:\/\// ) ? '' : config.KYOTO_HTML.HTML_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
  return `${prefix}${uri}`;
}
async function parse_index( cr )
{
  const dom = new JSDOM( iconv.decode( cr.data, 'UTF8' ) );
  const urls = Array.from( dom.window.document.querySelectorAll( 'a' ) )
    .map( tag => tag.textContent.match( /府内の感染状況/ ) && complement_uri( tag.href ) )
    .filter( v => v );
  let csv = [];
  for ( const url of urls )
  {
    Log.info( `receiving ${url} ...` );
    const crhtml = await axios_instance().get( url );
    csv = csv.concat( parse_html( crhtml.data ) );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
export default class PoiKyoto extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '京都府',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KYOTO_HTML.HTML_URI,
      cb_parse_csv: cr => parse_index( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

