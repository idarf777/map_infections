import BasePoi from "./base_poi.mjs";
import jsdom from "jsdom";
import iconv from "iconv-lite";
import {axios_instance} from "./util.mjs";
import Log from "./logger.mjs";
const { JSDOM } = jsdom;

const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['一関保健所管内', '一関市'],
  ['奥州保健所管内', '奥州市' ],
  ['久慈保健所管内', '久慈市' ],
  ['二戸保健所管内', '二戸市' ],
  ['宮古保健所管内', '宮古市' ],
  ['釜石保健所管内', '釜石市' ],
  ['大船渡保健所管内', '大船渡市' ],
];
async function parse_html_impl( html )
{
  const csv = [];
  const table = Array.from( new JSDOM( html ).window.document.querySelectorAll( 'table' ) ).find( t =>
    Array.from( t.querySelectorAll( 'th' ) ).find( th => th.textContent.match( /判明した日/ ) )
  );
  const thead = table.querySelector( 'thead' );
  const columnIndex = { date: null, city: null };
  const ths = Array.from( thead.querySelectorAll( 'th' ) );
  [ { col: 'date', str: '判明した日' }, { col: 'city', str: '居住地' } ].forEach( v => {
    columnIndex[ v.col ] = ths.findIndex( th => th.textContent.match( v.str ) )
  } );
  if ( columnIndex.date == null || columnIndex.city == null )
  {
    Log.info( `no column head` );
    return;
  }
  const prev = [];
  for ( let i=0; i<ths.length; i++ )
    prev.push( { value: null, count: 0 } );
  table.querySelectorAll( 'tbody' ).forEach( tbody => {
    tbody.querySelectorAll( "tr" ).forEach( (tr, row) => {
      const tds = Array.from( tr.querySelectorAll( "td" ) );
      if ( tds.length === 0 || tds.find( h => h.textContent.match( /\d+例目/ ) ) == null )
        return;
      if ( tds.length < prev.length )
      {
        Log.info( `bad column in ${row}` );
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
      if ( prev[ columnIndex.date ].value.match( /^(\s+|[-－ｰー]+)?$/ ) && csv.length > 0 )
      {
        date = csv[ csv.length - 1 ][ 0 ];
      }
      else
      {
        const m = prev[ columnIndex.date ].value.match( /(\d+)年(\d+)月(\d+)日/ );
        if ( !m )
          throw new Error("bad date");
        date = new Date( parseInt( m[ 1 ] ) + 2018, parseInt( m[ 2 ] ) - 1, parseInt( m[ 3 ] ) );
      }
      let city = prev[ columnIndex.city ].value.trim().replace( /\s/, '' );
      if ( city.match( /^[-－ｰー]$/ ) )
        city = "";
      csv.push( [ date, city ] );
    } );
  } );
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}

function gather_uri( html )
{
  return Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) )
    .map( tag => {
      if ( !tag.textContent.match( /公表分.+第.+例目/ ) )
        return null;
      let uri = tag.href;
      if ( !uri.match( /^https?:\/\// ) )
      {
        const host = config.IWATE_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
        uri = `${host}${uri}`;
      }
      return uri;
    } )
    .filter( v => v );
}

async function parse_html( html )
{
  const patients = await Promise.all(
    gather_uri( html )
      .map( async uri => {
        const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( uri );
        return parse_html_impl( iconv.decode( cr.data, 'UTF8' ) );
      } )
  );
  return patients.reduce( ( result, p ) => result.concat( p ), [] );
}

export default class PoiIwate extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '岩手県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.IWATE_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
