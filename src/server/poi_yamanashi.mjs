import xlsx from 'xlsx';
import {axios_instance, sanitize_poi_name} from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['東部地域', '大月市'], ['峡東地域', '甲州市'], ['峡南地域', '身延町'], ['中北地域', '甲府市'], ['富士北麓地域', '富士河口湖町']];
const mapCityNames = new Map();
const setCityNames = new Set();
for ( const n of ALTER_CITY_NAMES )
{
  for ( const v of n )
    setCityNames.add( v );
}

// async function parse_xlsx( cr )
// {
//   const book = xlsx.read( cr.data, { cellDates: true } );
//   const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
//   const range = worksheet['!ref'];
//   const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
//   const csv = [];
//   for ( let row = 2; row < rows; row++ )
//   {
//     const cellDate = worksheet[ `D${row}` ];
//     const cellPref = worksheet[ `C${row}` ];
//     const cellCity = worksheet[ `H${row}` ];
//     if ( cellDate?.t !== 'd' || cellCity?.t !== 's' || cellPref?.t !== 's' )
//       break;
//     if ( cellPref.v !== '山梨県' )
//       continue;
//     let city = cellCity.v.replace( /\s/g, ' ' ).replace( /（/g, '(' ).replace( /）/g, ')' );
//     if ( city.indexOf( '(' ) >= 0 )
//       city = city.match( /^.+?\((.+?)[,、　\s)]/ )[ 1 ]; // 最初の居住地だけをとる
//     csv.push( [ cellDate.v, sanitize_poi_name( city ) ] );
//   }
//   return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
// }
//
// function parse_html( html, mindate )
// {
//   const csv = [];
//   for ( const block of html.match( /(県内\d+例目第[\s\S]+?)<h4|新型コロナウイルス感染症患者の死亡について|$/g ) )
//   {
//     const m = block.match( /県内(\d+)例目第[\s\S]+?発生判明日[\s\S]+?(\d+)年(\d+)月(\d+)日/ );
//     if ( !m )
//       continue;
//     const year = parseInt( m[ 2 ] );
//     const cm = block.match( /(居住地|生活圏)[：:](.+?)<\//g );
//     const citycand = cm && cm[ ( cm.length > 1 && cm[ 0 ].startsWith( '居住地' ) ) ? 1 : 0 ];
//     let city = citycand.match( /[：:](.+?)<\// )[ 1 ] || '山梨県';
//     const cvs = city.split( /[、，,・･/／]/ );
//     const cvsf = cvs.filter( v => setCityNames.has( v ) );
//     city = (cvsf.length > 0) ? cvsf[ 0 ] : cvs[ 0 ];
//     const ccm = city.match( /^(<.+?>)?(.+?)([（(](.*)[)）])?$/ );
//     city = ccm[ (ccm[ 4 ] && setCityNames.has( ccm[ 4 ] )) ? 4 : 2 ];
//     const d = new Date( year + ((year < 2000) ? 2018 : 0), parseInt( m[ 3 ] ) - 1, parseInt( m[ 4 ] ) );
//     if ( d.getTime() > mindate.getTime() )
//       csv.push( [ d, city.trim() ] );
//   }
//   return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
// }
//
// async function parse_both( cr )
// {
//   const fromXlsx = await parse_xlsx( cr );
//   const mindate = ( fromXlsx.length > 0 ) ? fromXlsx[ fromXlsx.length - 1 ][ 0 ] : new Date( 0 );
//   const crhtml = await axios_instance( { responseType: 'arraybuffer' } ).get( config.YAMANASHI_XLSX.HTML_URI );
//   return fromXlsx.concat( parse_html( iconv.decode( crhtml.data, 'UTF8' ), mindate ) ).map( v => [ v[ 0 ], mapCityNames.get( v[ 1 ] ) || v[ 1 ] ] );
// }

async function load_xlsx( data )
{
  const html = iconv.decode( data, 'UTF8' );
  const m = html.match( /<a .*?href="([^.]+?\.xlsx)".*?>新型コロナウイルス陽性者の状況/ );
  if ( m == null )
    throw new Error( "no uri on yamanashi-pref" );
  let uri = m[ 1 ].trim();
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.YAMANASHI_XLSX.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
async function parse_xlsx( promise )
{
  const cr = await promise;
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 2; row < rows; row++ )
  {
    const cellDate = worksheet[ `D${row}` ];
    const cellCity = worksheet[ `H${row}` ];
    const isValidDate = cellDate?.t === 'd';
    const isValidCity = cellCity?.t === 's';
    if ( (!isValidDate && !isValidCity) || (!(isValidDate && isValidCity) && csv.length === 0) )
      break;
    const city = isValidCity ? sanitize_poi_name( cellCity.v.replace( /[\s]/g, '' ) ) : csv[ csv.length-1 ][ 1 ];
    const ccm = city.match( /^(.+?)([（(](.+?)([、，,・･/／].+)?[)）])$/ ); // 初めの1都市だけ採用する
    csv.push( [ isValidDate ? cellDate.v : csv[ csv.length-1 ][ 0 ], ccm ? ccm[ 3 ] : city ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}

export default class PoiYamanashi extends BasePoi
{
  static async load()
  {
    // return BasePoi.process_csv( {
    //   pref_name: '山梨県',
    //   alter_citys: ALTER_CITY_NAMES,
    //   csv_uri: config.YAMANASHI_XLSX.DATA_URI,
    //   cb_parse_csv: cr => parse_both( cr ),
    //   row_begin: 0,
    //   min_columns: 2,
    //   col_date: 0,
    //   col_city: 1
    // } );
    return BasePoi.process_csv( {
      pref_name: '山梨県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.YAMANASHI_XLSX.INDEX_URI,
      cb_parse_csv: cr => parse_xlsx( load_xlsx( cr.data ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
