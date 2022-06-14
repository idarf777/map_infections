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
  const csv = [];
  for ( let sheet = 0; sheet < 2; sheet++ )
  {
    const worksheet = book.Sheets[ book.SheetNames[ sheet ] ];
    const range = worksheet['!ref'];
    const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
    const columnIndex = { date: null, city: null };
    for ( let row = 1; row < rows; row++ )
    {
      const cellNo = worksheet[ `B${row}` ];
      if ( cellNo?.t === 's' && cellNo.v.match( /No\./ ) ) // 見出しがなぜか2行ある
      {
        const cols = ['C','D','E','F','G','H','I','J'];
        [ { col: 'date', str: '発症日' }, { col: 'datesub', str: '検査確定日' }, { col: 'city', str: '居住地' } ].forEach( v => {
          columnIndex[ v.col ] = cols.find( c => worksheet[ `${c}${row}` ]?.t === 's' && worksheet[ `${c}${row}` ].v.match( v.str ) );
        } );
        continue;
      }
      if ( columnIndex.date == null || columnIndex.city == null )
        continue;
      let cellDate = worksheet[ `${columnIndex.date}${row}` ];
      if ( cellDate?.t !== 'd' )
        cellDate = worksheet[ `${columnIndex.datesub}${row}` ];
      const cellCity = worksheet[ `${columnIndex.city}${row}` ];
      const isValidDate = cellDate?.t === 'd';
      const isValidCity = cellCity?.t === 's';
      if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
        break;
      const city = isValidCity ? sanitize_poi_name( cellCity.v.replace( /[\s]/g, '' ) ) : csv[ csv.length-1 ][ 1 ];
      const ccm = city.match( /^(.+?)([（(](.+?)([、，,・･/／].+)?[)）])$/ ); // 初めの1都市だけ採用する
      csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], ccm ? ccm[ 3 ] : city ] );
    }
  }
  return csv; //csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
function complement_uri( uri )
{
  if ( !uri.match( /^https?:\/\// ) )
    return uri;
  const host = config.CHIBA_PDF.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
  return `${host}${uri}`;
}
async function parse_html( html )
{
  const dom = new JSDOM( html );
  let csv = [];
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( tag.textContent.match( /新型コロナウイルス感染症患者等の県内発生状況について.*エクセル/ ) )
    {
      let uri = tag.href;
      if ( !uri.match( /^https?:\/\// ) )
        uri = complement_uri( uri )
      const xlsx = await axios_instance( { responseType: 'arraybuffer' } ).get( uri );
      csv.push( parse_xlsx( xlsx ) );
    }
  }
  if ( csv.length === 0 )
    throw new Error( "no xlsx link in chiba" );
  csv = await Promise.all( csv );
  return csv.flat().sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
async function parse_index( html )
{
  const dom = new JSDOM( html );
  let uri = null;
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( tag.textContent.match( /感染者数等の詳細データ/ ) )
    {
      uri = tag.href;
      const sharp = uri.indexOf( "#" );
      if ( sharp >= 0 )
        uri = uri.slice( 0, sharp );
      break;
    }
  }
  if ( !uri )
    throw new Error( "no html link in chiba" );
  if ( !uri.match( /^https?:\/\// ) )
    uri = complement_uri( uri )
  const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( uri );
  return parse_html( iconv.decode( cr.data, 'UTF8' ) );
}

export default class PoiChiba extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '千葉県',
      csv_uri: config.CHIBA_PDF.INDEX_URI,
      cb_parse_csv: cr => parse_index( iconv.decode( cr.data, 'UTF8' ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
