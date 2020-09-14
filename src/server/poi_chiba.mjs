import iconv from "iconv-lite";
import jsdom from 'jsdom';
import pdfjsLib from 'pdfjs-dist/es5/build/pdf.js';
import BasePoi from "./base_poi.mjs";
import Log from './logger.mjs';
import axios from "axios";
const config = global.covid19map.config;
const { JSDOM } = jsdom;

async function getPdfText( data )
{
  const pdf = await (await pdfjsLib.getDocument( { data } ).promise);
  return Promise.all( Array.from( { length: pdf.numPages }, async ( v, i ) => {
    const items = (await (await pdf.getPage( i+1 )).getTextContent()).items;
    const rows = [], row = [];
    let x = items[ 0 ]?.transform[ 4 ];
    for ( const item of items )
    {
      const newx = item.transform[ 4 ];
      if ( newx < x )
      {
        rows.push( row.join( ' ' ) );
        row.splice( 0 );
      }
      x = newx;
      row.push( item.str );
    }
    if ( row.length > 0 )
      rows.push( row.join( ' ' ) );
    return { text: rows, items };
  } ) );
}
async function parse_html( html )
{
  const dom = new JSDOM( html );
  let uri = null;
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( tag.textContent.match( /新型コロナウイルス感染症患者等の県内発生状況について\s*[(（]PDF/ ) )
    {
      uri = tag.href;
      break;
    }
  }
  if ( !uri )
    throw new Error( "no pdf link in chiba" );
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.CHIBA_PDF.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  const cr = await axios.create( { responseType: 'arraybuffer', timeout: config.HTTP_GET_TIMEOUT } ).get( uri, { 'axios-retry': { retries: config.HTTP_RETRY } } );
  return (await getPdfText( cr.data )).flatMap( row => row.text ).map( row => {
    const col = row.split( ' ' );
    if ( col.length < 6 || !col[ 0 ].match( /^\d+$/ ) )
      return null;
    const dm = col[ 5 ].match( /((\d+)年)?(\d+)月(\d+)日/ );
    if ( !dm )
      return null;
    let year = dm[ 2 ] ? parseInt( dm[ 2 ] ) : new Date().getFullYear();
    if ( year < 2000 )
      year += 2018; // 令和
    return [ new Date( `${year}-${dm[ 3 ]}-${dm[ 4 ]}` ), col[ 3 ] ];
  } ).filter( v => v );
}
export default class PoiChiba extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '千葉県',
      csv_uri: config.CHIBA_PDF.INDEX_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
