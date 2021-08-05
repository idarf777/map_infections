import xlsx from 'xlsx';
import {axios_instance, sanitize_poi_name} from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['塩釜保健所管内', '塩竈市'],
  ['大崎保健所管内', '大崎市'],
  ['気仙沼保健所管内', '気仙沼市'],
  ['石巻保健所管内', '石巻市'],
  ['登米保健所管内', '登米市'],
  ['仙台市保健所管内', '仙台市'],
  ['仙南保健所管内', '大河原町'],
  ['栗原保健所管内', '栗原市'],
];
async function load_xlsx( data )
{
  const html = iconv.decode( data, 'UTF8' );
  const m = html.match( /<a .*?href="([^.<>"]+?\.xlsx)".*?>.+?患者状況一覧表/ );
  if ( m == null )
    throw new Error( "no uri on miyagi-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.MIYAGI_XLSX.HTML_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
async function parse_xlsx( promise )
{
  const cr = await promise;
  const book = xlsx.read( cr.data, { cellDates: true } );
  const wsName = book.SheetNames.find( name => name.startsWith( '患者状況一覧' ) );
  if ( wsName == null )
    throw new Error( "宮城県 : no worksheet" );
  const worksheet = book.Sheets[ wsName ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 4; row < rows; row++ )
  {
    const cellDate = worksheet[ `B${row}` ];
    const cellCity = worksheet[ `F${row}` ];
    const isValidDate = cellDate?.t === 'd';
    const isValidCity = cellCity?.t === 's';
    if ( cellCity.t === 'e' )
    {
      Log.info( `宮城県 : row ${row} is skipped` );
      continue;
    }
    if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
      break;
    csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], isValidCity ? sanitize_poi_name( cellCity.v ) : csv[ csv.length-1 ][ 1 ] ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
export default class PoiMiyagi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '宮城県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.MIYAGI_XLSX.HTML_URI,
      cb_parse_csv: cr => parse_xlsx( load_xlsx( cr.data ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
