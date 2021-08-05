import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import jschardet from "jschardet";
import {axios_instance} from "./util.mjs";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
];

function complement_uri( uri )
{
  const prefix = uri.match( /^https?:\/\// ) ? '' : config.MIYAZAKI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
  return `${prefix}${uri}`;
}

function parse_cases( html, startYear )
{
  const csv = [];
  let currentYear = startYear;
  const origs = Array.from( new JSDOM( html ).window.document.querySelectorAll( "table" ) );
  const tables = origs.filter( t => Array.from( t.querySelectorAll( "th" ) ).find( h => h.textContent.includes( "判明日" ) ) );
  tables.forEach( table => {
    const prev = [];
    for ( let i=0; i<6; i++ )
      prev.push( { value: null, count: 0 } );
    const index = { date: 2, city: 5 };
    table.querySelectorAll( "th" ).forEach( (th, idx) => {
      if ( th.textContent.match( /判明日/ ) )
        index.date = idx;
      else if ( th.textContent.match( /居住地/ ) )
        index.city = idx;
    } );
    table.querySelectorAll( "tr" ).forEach( tr => {
      const tds = Array.from( tr.querySelectorAll( "td" ) );
      if ( tds.length === 0 )
        return;
      for ( let i=0,t=0; i<prev.length; i++ )
      {
        if ( prev[ i ].count > 0 )
        {
          prev[ i ].count--;
        }
        else
        {
          prev[ i ].count = tds[ t ].rowSpan - 1;
          prev[ i ].value = tds[ t ].textContent;
          t++;
        }
      }
      let date = null;
      if ( prev[ index.date ].value.match( /^(\s+|[-－ｰー]+)?$/ ) && csv.length > 0 )
      {
        date = csv[ csv.length - 1 ][ 0 ];
      }
      else
      {
        const m = prev[ index.date ].value.match( /(\d+)月(\d+)日/ );
        if ( !m )
          throw new Error("bad date");
        date = new Date( currentYear, parseInt( m[ 1 ] ) - 1, parseInt( m[ 2 ] ) );
      }
      let city = prev[ index.city ].value.trim().replace( /\s/, '' );
      if ( city.match( /^[-－ｰー]$/ ) )
        city = "";
      csv.push( [ date, city ] );
    } );
  } );
  return csv;
}

async function receive_html( url )
{
  Log.info( `parsing ${url} ...` );
  const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( complement_uri( url ) );
  return iconv.decode( cr.data, jschardet.detect( cr.data ).encoding );
}

async function parse_html( html )
{
  let year = new Date().getFullYear();
  const csv = parse_cases( html, year );
  // 過去の事例
  const tag = Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) ).find( tag => tag.textContent.match( /感染者状況一覧/ ) );
  if ( tag )
  {
    const pasttags = Array.from( new JSDOM( await receive_html( tag.href ) ).window.document.querySelectorAll( 'a' ) ).filter( tag => tag.textContent.match( /\d+月/ ) );
    for ( let i=0; i<pasttags.length; i++ )
    {
      const m = pasttags[ i ].href.match( /(\d{4})(\d{2})\.html$/ );
      if ( m )
        csv.concat( parse_cases( await receive_html( pasttags[ i ].href ), parseInt( m[ 1 ] ) ) );
    }
  }
  return csv;
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    const pref_name = '宮崎県';
    return BasePoi.process_csv( {
      pref_name,
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.MIYAZAKI_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

