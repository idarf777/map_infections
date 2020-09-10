import xlsx from 'xlsx';
import { sanitize_poi_name } from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import axios from "axios";
import iconv from "iconv-lite";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['県西', '日光市'], ['県南', '佐野市'], ['県央', '宇都宮市'], ['県北', '那須塩原市'], ['宇都宮', '宇都宮市'], ['安足', '足利市']];
async function load_xlsx( data )
{
  const html = iconv.decode( data, 'UTF8' );
  const m = html.match( /<a\s+href="(.+?\.xlsx)"\s*>\s*栃木県における新型コロナウイルス感染症の発生状況一覧/ );
  if ( m == null )
    throw new Error( "no uri on tochigi-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.TOCHIGI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios.create( { responseType: 'arraybuffer', timeout: config.HTTP_GET_TIMEOUT } ).get( uri, { 'axios-retry': { retries: config.HTTP_RETRY } } );
}
async function parse_xlsx( promise )
{
  const cr = await promise;
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 3; row < rows; row++ )
  {
    const cellDate = worksheet[ `E${row}` ];
    const cellCity = worksheet[ `D${row}` ];
    const cellNote = worksheet[ `G${row}` ];
    const isValidDate = cellDate?.t === 'd';
    const isValidCity = cellCity?.t === 's';
    if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
      break;
    if ( cellNote?.t === 's' && cellNote.v.match( /削除/ ) )
      continue;
    csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], isValidCity ? sanitize_poi_name( cellCity.v ) : csv[ csv.length-1 ][ 1 ] ] );
  }
  return csv;
}
export default class PoiTochigi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '栃木県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.TOCHIGI_HTML.DATA_URI,
      cb_parse_csv: cr => parse_xlsx( load_xlsx( cr.data ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
