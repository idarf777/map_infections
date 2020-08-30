import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import axios from "axios";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['乙訓保健所管内', '長岡京市'], ['乙訓管内', '長岡京市'], ['山城管内', '宇治市'], ['丹後管内', '京丹後市'], ['南丹管内', '亀岡市'], ['中丹管内', '福知山市']];
const FILTER_CITY_NAMES = [['管内', ''], ['府内', ''], ['京都府内', ''], ['京都市内', '京都市']];
const mapCityNames = new Map();
FILTER_CITY_NAMES.forEach( v => mapCityNames.set( v[ 0 ], v[ 1 ] ) );

async function parse_json( cr )
{
  const json = JSON.parse( iconv.decode( cr.data, 'UTF8' ) );
  return json[ 'patients' ][ 'data' ].map( p => [ new Date( p[ 'date' ] ), p[ '居住地' ] ] ).sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
function parse_html( html, mindate )
{
  const csv = [];
  const re = /<tr>[\s\S]*?<td>(\d+)例目<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>(.*?)<\/td>/g;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const date = m[ 2 ];
    const city = m[ 3 ];
    const dm = date.trim().match( /^(.+?)(\d+)年(\d+)月(\d+)日$/ );
    if ( !dm || dm[ 1 ] !== '令和' )
      continue;
    const d = new Date( parseInt( dm[ 2 ] ) + 2018, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) );
    if ( d.getTime() > mindate.getTime() )
      csv.push( [ d, city ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}
async function parse_both( cr )
{
  const fromJson = await parse_json( cr );
  const mindate = ( fromJson.length > 0 ) ? fromJson[ fromJson.length - 1 ][ 0 ] : new Date( 0 );
  const crhtml = await axios.create( { 'responseType': 'arraybuffer' } ).get( config.KYOTO_JSON.HTML_URI );
  return fromJson.concat( parse_html( iconv.decode( crhtml.data, 'UTF8' ), mindate ) ).map( v => [ v[ 0 ], mapCityNames.get( v[ 1 ] ) || v[ 1 ] ] );
}
export default class PoiKyoto extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '京都府',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KYOTO_JSON.DATA_URI,
      cb_parse_csv: cr => parse_both( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

