import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import jschardet from "jschardet";
import {axios_instance} from "./util.mjs";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['善通寺', '善通寺市'],
  ['観音寺', '観音寺市']
];

function complement_uri( uri )
{
  const prefix = uri.match( /^https?:\/\// ) ? '' : config.KAGAWA_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
  return `${prefix}${uri}`;
}

function parse_cases( html, startYear )
{
  const csv = [];
  let currentYear = startYear;
  let lastDate = null;
  const tables = Array.from( new JSDOM( html ).window.document.querySelectorAll( "table[summary='発生状況一覧']" ) );
  const table = tables.find( t => t.querySelectorAll( "tr" ).length > 2 ); // summaryが同じTABLEが複数ある
  table.querySelectorAll( "tr" ).forEach( tr => {
    const tds = Array.from( tr.querySelectorAll( "td" ) );
    let date = null;
    let idxCity = 4;
    if (lastDate != null && tds.length === 4 )
    {
      date = lastDate;
      idxCity--;
    }
    else if ( tds.length >= 5 )
    {
      const m = tds[ 1 ].textContent.match( /(\d+)月(\d+)日/ );
      if ( m )
      {
        date = new Date( currentYear, parseInt( m[ 1 ] ) - 1, parseInt( m[ 2 ] ) );
        if ( lastDate && lastDate.getMonth() < date.getMonth() )
        {
          currentYear--;
          date.setFullYear( currentYear )
        }
        lastDate = date;
      }
    }
    if ( date == null )
      return;

    let city = tds[ idxCity ].textContent.trim();
    if ( city.match( /^[-－ｰー]$/ ) )
      city = "";

    csv.push( [ date, city ] );
  } );
  return csv;
}

async function parse_html( html )
{
  let year = new Date().getFullYear();
  const csv = parse_cases( html, year );
  if ( csv.length > 0 )
  {
    const lastDate = csv[ csv.length - 1 ][ 0 ];
    year = lastDate.getFullYear();
    if ( lastDate.getMonth() === 0 && lastDate.getDate() <= 3 )
      year--; // 終わりが三が日なら、過去の事例は昨年から始まると見なす
  }
  // 過去の事例
  const tag = Array.from( new JSDOM( html ).window.document.querySelectorAll( 'a' ) ).find( tag => tag.textContent.match( /県内で確認された事例/ ) );
  if ( tag == null )
    return csv;
  const cr = await axios_instance( { responseType: 'arraybuffer' } ).get( complement_uri( tag.href ) );
  return csv.concat( parse_cases( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ), year ) );
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    const pref_name = '香川県';
    return BasePoi.process_csv( {
      pref_name,
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KAGAWA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, jschardet.detect( cr.data ).encoding ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

