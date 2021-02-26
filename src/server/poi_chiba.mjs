import iconv from "iconv-lite";
import jsdom from 'jsdom';
import BasePoi from "./base_poi.mjs";
import Log from './logger.mjs';
import {axios_instance, sanitize_poi_name} from "./util.mjs";
import xlsx from "xlsx";
const config = global.covid19map.config;
const { JSDOM } = jsdom;

async function parse_xlsx( promise )
{
  const cr = await promise;
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 7; row < rows; row++ )
  {
    const cellDate = worksheet[ `G${row}` ];
    const cellCity = worksheet[ `E${row}` ];
    const isValidDate = cellDate?.t === 'd';
    const isValidCity = cellCity?.t === 's';
    if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
      break;
    const city = isValidCity ? sanitize_poi_name( cellCity.v.replace( /[\s]/g, '' ) ) : csv[ csv.length-1 ][ 1 ];
    const ccm = city.match( /^(.+?)([（(](.+?)([、，,・･/／].+)?[)）])$/ ); // 初めの1都市だけ採用する
    csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], ccm ? ccm[ 3 ] : city ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
async function parse_html( html )
{
  const dom = new JSDOM( html );
  let uri = null;
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( tag.textContent.match( /新型コロナウイルス感染症患者等の県内発生状況について\s*[(（]エクセル/ ) )
    {
      uri = tag.href;
      break;
    }
  }
  if ( !uri )
    throw new Error( "no xlsx link in chiba" );
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.CHIBA_PDF.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
export default class PoiChiba extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '千葉県',
      csv_uri: config.CHIBA_PDF.INDEX_URI,
      cb_parse_csv: cr => parse_xlsx( parse_html( iconv.decode( cr.data, 'UTF8' ) ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
