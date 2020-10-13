import xlsx from 'xlsx';
import {axios_instance, sanitize_poi_name} from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [];
async function load_xlsx( data )
{
  const html = iconv.decode( data, 'CP932' );
  const m = html.match( /<a\s+href="(.+?\.xlsx)"\s*>\s*富山県内における新型コロナウイルス感染症の発生状況一覧/ );
  if ( m == null )
    throw new Error( "no uri on toyama-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.TOYAMA_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
async function parse_xlsx( promise )
{
  const cr = await promise;
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 4; row < rows; row++ )
  {
    const cellDate = worksheet[ `C${row}` ];
    const cellCity = worksheet[ `F${row}` ];
    const isValidDate = cellDate?.t === 'd';
    const isValidCity = cellCity?.t === 's';
    if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
      break;
    csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], isValidCity ? sanitize_poi_name( cellCity.v ) : csv[ csv.length-1 ][ 1 ] ] );
  }
  return csv;
}
export default class PoiToyama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '富山県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.TOYAMA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_xlsx( load_xlsx( cr.data ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
