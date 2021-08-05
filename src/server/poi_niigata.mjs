import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import pdfjsLib from 'pdfjs-dist/es5/build/pdf.js';
import jsdom from 'jsdom';
import jschardet from "jschardet";
import {axios_instance, parse_csv} from "./util.mjs";
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['柏崎保健所管内', '柏崎市'],
  ['三条保健所管内', '三条市'],
  ['長岡保健所管内', '長岡市'],
  ['村上保健所管内', '村上市'],
  ['南魚沼保健所管内', '南魚沼市'],
  ['新発田保健所管内', '新発田市'],
];

// HTTP(S)のURIを補完する
function complement_uri( uri )
{
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.NIIGATA_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return uri;
}

function merge_row( row )
{
  //  => xとwidthで文字列の画面上の長さをとり、どの文字列が繋がっているかを判断する
  if ( row.length <= 1 )
    return row[ 0 ]?.str || '';
  const THRESHOLD_X = 0; // 20; // 0なら文字列はitemの区切り
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
    let x = items[ 0 ]?.transform[ 4 ];
    let w = items[ 0 ]?.width;
    for ( const item of items )
    {
      const newx = item.transform[ 4 ];
      if ( newx < x + w )
      {
        let str = merge_row( row );
        rows.push( str );
        row.splice( 0 );
      }
      x = newx;
      w = item.width;
      row.push( item );
    }
    if ( row.length > 0 )
      rows.push( merge_row( row ) );
    return { text: rows, items };
  } ) );
}

// この期に及んで、新潟県はPDFでデータを公開するばかりか、日付に年が入っていない
// 2022年になったらどうする……
async function read_pdf( data )
{
  const csv = [];
  let prevdate = null;
  for ( const rows of await getPdfText( data ) )
  {
    for ( const row of rows.text )
    {
      // row = "3342 新潟市1309例目 6月10日（木曜日） 30歳代 女性 新潟市秋葉区 会社員 調査中 患者No.3322例目の濃厚接触者"
      const words = row.split( /\s+/ )
      if (words.length < 7 || !words[ 0 ].match( /\d+/ ) )
        continue;
      const m = words[ 2 ].match( /^(\d+)[^\d]+(\d+)/ );
      if ( !m )
        continue;
      const date = new Date( `${new Date().getFullYear()}-${m[ 1 ]}-${m[ 2 ]}` );
      if ( prevdate && (prevdate.getMonth() === 1 - 1) && (prevdate.getDate() === 1) && (date.getMonth() === 12 - 1) && (date.getDate() === 31) )
        return csv; // 年をまたいだ
      prevdate = date;
      csv.push( [ date, words[ 5 ] ] );
    }
  }
  return csv;
}

// linkタグのJSを全て読んでデータを探す
async function parse_pdf( html )
{
  let promises = [];
  const dom = new JSDOM( html );
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( !tag.textContent.match( /感染者の発生状況.+PDFファイル/ ) )
      continue;
    const uri = complement_uri( tag.href );
    Log.info( `loading ${uri}...` );
    const cr = await axios_instance({ responseType: 'arraybuffer' }).get( uri ).catch( err => Log.error(err));
    promises.push( read_pdf( cr.data ) );
  }
  const csvs = await Promise.all( promises );
  const csv = [];
  for ( const c of csvs )
    Array.prototype.push.apply( csv, c );
  return csv;
}


function remove_tags( str )
{
  return str.replace( /<\/?.+?>/g, '' );
}
async function parse_html( html )
{
  const pdfcsv = await parse_pdf( html );
  const rootm = html.match( /県内における感染者の発生状況[\s\S]+?<tbody>[\s\S]*?(<tr[\s\S]+?)<\/tbody>/ );
  const roottable = rootm && rootm[ 1 ];
  if ( !roottable )
    throw new Error( "not matched in 新潟県" );
  const csv = [];
  //                            通し番号                         何例目                         日付                          年齢                         性別                         居住地
  const re = /<tr>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]+?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]+?)<\/td>[\s\S]*?<\/tr>/g;
  while ( true )
  {
    const m = re.exec( roottable );
    if ( !m )
      break;
    const num = remove_tags( m[ 1 ] );
    const mark = remove_tags( m[ 2 ] );
    const date = remove_tags( m[ 3 ] );
    const city = remove_tags( m[ 4 ] );
    const nm = num.match( /(\d+)/ );
    if ( !nm )
      continue;
    if ( parseInt( nm[ 1 ] ) <= 547 )
      break;  // これ以前のものはCSV化済み  2022年はどうなるやら
    const mm = mark.match( /([^\d]+)(\d+)例目/ );
    if ( !mm )
      continue;
    const rootcity = mm[ 1 ].trim();
    const dm = date.trim().match( /((\d+)年)?(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    let year = new Date().getFullYear();
    if ( dm[ 2 ] )
    {
      year = parseInt( dm[ 2 ] );
      if ( year < 2000 )
        year += 2018; // 令和
    }
    const cm = city.match( /[(（](.+?)[)）]/ );
    let livein = cm ? cm[ 1 ] : city;
    if ( livein.match( /内滞在中/ ) )
      livein = rootcity;
    csv.push( [ new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) ), livein.replace( /^(県外|県内|帰省先)[:：]/, '' ).replace( /滞在$/, '' ) ] );
  }
  return pdfcsv.concat( csv );
}
export default class PoiNiigata extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '新潟県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.NIIGATA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

