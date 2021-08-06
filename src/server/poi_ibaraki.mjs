import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import jschardet from "jschardet";
import {axios_instance} from "./util.mjs";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['県南地域', 'つくば市'], ['竜ケ崎保健所管内', '龍ケ崎市'], ['筑西保健所管内', '筑西市'], ['中央保健所管内', '水戸市'], ['土浦保健所管内', '土浦市'], ['潮来保健所管内', '潮来市'], ['古河保健所管内', '古河市'], ['ひたちなか保健所管内', 'ひたちなか市']] ;

function complement_uri( uri )
{
  const prefix = uri.match( /^https?:\/\// ) ? '' : config.IBARAKI_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
  return `${prefix}${uri}`;
}

function parse_cases( html, startYear )
{
  const csv = [];
  let currentYear = startYear;
  const origs = Array.from( new JSDOM( html ).window.document.querySelectorAll( "table" ) );
  const tables = origs.filter( t => Array.from( t.querySelectorAll( "td" ) ).find( h => h.textContent.includes( "公表日" ) ) );
  tables.forEach( table => {
    const prev = [];
    const firstRow = Array.from( table.querySelector( "tr" ).children );  // thを使っていない
    for ( let i=0; i<firstRow.length; i++ )
      prev.push( { value: null, count: 0 } );
    const index = { date: 0, city: 3 };
    firstRow.forEach( (th, idx) => {
      if ( th.textContent.match( /公表日/ ) )
        index.date = idx;
      else if ( th.textContent.match( /居住地/ ) )
        index.city = idx;
    } );
    table.querySelectorAll( "tr" ).forEach( (tr, row) => {
      const tds = Array.from( tr.querySelectorAll( "td" ) );
      if ( tds.length === 0 || tds.find( h => h.textContent.includes( "公表日" ) ) )
        return;
      if ( tds.length < prev.length )
      {
        // 時折PDFへのリンクが貼られているが、仕方ないので無視する
        Log.info( `bad column (probably PDF link) in ${row}` );
        return;
      }
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
        const m = prev[ index.date ].value.match( /(\d+)\/(\d+)/ );
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
  const tags = Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) ).filter( tag => tag.textContent.match( /陽性者一覧.+令和(\d+)年(\d+)月(\d+)日～/ ) );
  for ( let i=0; i<tags.length; i++ )
  {
    const tag = tags[ i ];
    const pm = tag.textContent.match( /令和(\d+)年(\d+)月(\d+)日～/ );
    const pastyear = parseInt( pm[ 1 ] ) + 2018; // 令和 -> 西暦
    if ( pastyear > 2020 )  // 2020年以前はパース済みのデータが存在する
      csv.concat( parse_cases( await receive_html( tag.href ), pastyear ) );
  }
  return csv;
}


export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    const pref_name = '茨城県';
    return BasePoi.process_csv( {
      pref_name,
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.IBARAKI_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

