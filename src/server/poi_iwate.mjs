import BasePoi from "./base_poi.mjs";
import jsdom from "jsdom";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
const { JSDOM } = jsdom;

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [];
async function parse_html_impl( html )
{
  const csv = [];
  const rootm = html.match( /に関する情報[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    return csv;
  const rows = rootm[ 1 ];
  //                                何例目                           年齢                        性別                            居住地                        日付
  const re = /<tr.*?>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    const mr = m.map( (v,i) => (i > 0) && v.replace( /&.+?;/g, '' ).trim() );
    const dm = mr[ 3 ].match( /(\d+)年(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    const am = mr[ 2 ].match( /[:：]([^)）]+)/ );
    const city = am ? am[ 1 ] : mr[ 2 ];
    csv.push( [ new Date( parseInt( dm[ 1 ] ) + 2018, parseInt( dm[ 2 ] ) - 1, parseInt( dm[ 3 ] ) ), city.replace( /<.+?>/g, '' ) ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}

function gather_uri( html )
{
  return Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) )
    .map( tag => {
      if ( !tag.textContent.match( /公表分.+第\d+例目/ ) )
        return null;
      let uri = tag.href;
      if ( !uri.match( /^https?:\/\// ) )
      {
        const host = config.IWATE_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
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
  );
  return patients.reduce( ( result, p ) => result.concat( p ), [] );
}

export default class PoiIwate extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '岩手県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.IWATE_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
