import iconv from "iconv-lite";
import jsdom from 'jsdom';
import pdfjsLib from 'pdfjs-dist/es5/build/pdf.js';
import BasePoi from "./base_poi.mjs";
import Log from './logger.mjs';
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;
const { JSDOM } = jsdom;

function merge_row( row )
{
  // 半角数字が別の文字列として記述されているクソPDFなことがある
  //  => xとwidthで文字列の画面上の長さをとり、どの文字列が繋がっているかを判断する
  if ( row.length <= 1 )
    return row[ 0 ]?.str || '';
  const THRESHOLD_X = 15;
  let xe = row[ 0 ].transform[ 4 ] + row[ 0 ].width;
  return row.map( item => {
    let str = '';
    const x = item.transform[ 4 ];
    if ( x - xe >= THRESHOLD_X )
    {
      // 別の文字列が始まったとみなす
      str = ' ';
    }
    xe = x + item.width;
    return str.concat( item.str );
  } ).join( '' );
}

async function getPdfText( data )
{
  const pdf = await (await pdfjsLib.getDocument( { data } ).promise);
  return Promise.all( Array.from( { length: pdf.numPages }, async ( v, i ) => {
    const items = (await (await pdf.getPage( i+1 )).getTextContent()).items;
    const rows = [], row = [];
    let built = null;
    let x = items[ 0 ]?.transform[ 4 ];
    let w = items[ 0 ]?.width;
    for ( const item of items )
    {
      const newx = item.transform[ 4 ];
      if ( newx < x + w )
      {
        let str = merge_row( row );
        if ( built == null && rows.length > 0 && rows[ rows.length-1 ].match( /^新型コロナウイルス感染症患者等の県内発生状況について/ ) )
        {
          str = str.replace( /[\s]/g, '' );
          built = str; // PDFの作成日
        }
        rows.push( str );
        row.splice( 0 );
      }
      x = newx;
      w = item.width;
      row.push( item );
    }
    if ( row.length > 0 )
      rows.push( row.join( ' ' ) );
    return { page: i, text: rows, items, built };
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
  const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( uri );
  const rows = (await getPdfText( cr.data )).sort( (a,b) => a.page - b.page );
  let builtyear = 2021;
  const bm = rows.find( row => row.built )?.built.match( /(\d+)年/ );
  if ( bm )
  {
    builtyear = parseInt( bm[ 0 ] );
    if ( builtyear < 2000 )
      builtyear += 2018; // 令和
  }
  const IDX_THRESHOLD = 1500; // ここは市区町村によって異なる
  const STAGE_SEEKING = 0;  // 1月を探している
  const STAGE_HEADED = 1;   // 2月になった
  let stage = STAGE_SEEKING;
  //return rows.flatMap( row => row.text ).map( row => {
  const flatrows = rows.flatMap( row => row.text );
  return flatrows.map( row => {
    try
    {
      const col = row.split( ' ' );
      if ( col.length < 6 || !col[ 0 ].match( /^\d+$/ ) )
        return null;
      const col_date = col[ 5 ].match( "調査中" ) ? 6 : 5;
      const dm = col[ col_date ].match( /((\d+)年)?(\d+)月(\d+)日/ );
      if ( !dm )
        return null;
      let year = builtyear;
      const month = parseInt( dm[ 3 ] );
      if ( dm[ 2 ] )
      {
        throw new Error( "year exists" );
        //year = parseInt( dm[ 2 ] );
        //if ( year < 2000 )
        //  year += 2018; // 令和
      }
      else
      {
        // データに年が書かれていない場合の対応
        const idx = parseInt( col[ 0 ] );
        if ( idx < IDX_THRESHOLD )
          return null;
        if ( idx === 1 )
          stage = STAGE_SEEKING;
        switch ( stage )
        {
        case STAGE_SEEKING:
          if ( month > 2 )
            return null;
          if ( month === 2 )
            stage = STAGE_HEADED;
          break;
        case STAGE_HEADED:
          break;  // 2022年のことはとりあえず考えない
        default:
          break;
        }
      }
      const cm = col[ 3 ].match( /(.+?市(.+?区)?)/ );
      return [ new Date( `${year}-${month}-${dm[ 4 ]}` ), cm ? cm[ 1 ] : col[ 3 ] ];
    }
    catch ( ex )
    {
      Log.error( ex );
    }
    return null;
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
