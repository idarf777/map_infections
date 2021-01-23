import BasePoi from "./base_poi.mjs";
import jsdom from "jsdom";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
const { JSDOM } = jsdom;

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['由利本荘保健所管内', '由利本荘市'],
  ['横手保健所管内', '横手市'],
  ['大館保健所管内', '大館市'],
  ['大仙保健所管内', '大仙市'],
  ['湯沢保健所管内', '湯沢市'],
  ['能代保健所管内', '能代市'],
  ['秋田中央保健所管内', '秋田市'],
  ['秋田市保健所管内', '秋田市'],
  ['北秋田保健所管内', '北秋田市'],
];
async function parse_html_impl( html )
{
  const csv = [];
  const rootm = html.match( /概要[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    return csv;
  const rows = rootm[ 1 ];
  //                                何例目                           日付                         年齢                        性別                            居住地
  const re = /<tr.*?>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  let prev_date = null;
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    const mr = m.map( (v,i) => (i > 0) && v.replace( /&.+?;/g, '' ).trim() );
    const dm = mr[ 2 ].match( /((\d+)年)?(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    let year = dm[ 2 ] ? parseInt( dm[ 2 ] ) : new Date().getFullYear();
    if ( year < 2000 )
      year += 2018; // 令和
    const am = mr[ 3 ].match( /[:：]([^)）]+)/ );
    const city = am ? am[ 1 ] : mr[ 3 ];
    const date = new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) );
    if ( prev_date != null && prev_date.getTime() < date.getTime() )
      break;  // 年の境目を越えた
    prev_date = date;
    csv.push( [ date, city.replace( /[(（].+?[)）]/g, '' ) ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}

function gather_uri( html )
{
  return Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) )
    .map( tag => {
      const m = tag.textContent.match( /から(\d+)例目までの概要はこちら/ );
      if ( !m || parseInt( m[ 1 ] ) <= 189 )  // やむなく直打ち
        return null;
      let uri = tag.href;
      if ( !uri.match( /^https?:\/\// ) )
      {
        const host = config.AKITA_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
        uri = `${host}${uri}`;
      }
      return uri;
    } )
    .filter( v => v );
}

async function parse_html( html )
{
  const patients = await Promise.all(
    gather_uri( html )
      .map( async uri => {
        const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( uri );
        return parse_html_impl( iconv.decode( cr.data, 'UTF8' ) );
      } )
      .concat( [ parse_html_impl( html ) ] )
  );
  return patients.reduce( ( result, p ) => result.concat( p ), [] );
}

export default class PoiAkita extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '秋田県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.AKITA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
