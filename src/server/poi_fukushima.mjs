import xlsx from 'xlsx';
import { sanitize_poi_name } from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import axios from "axios";
import iconv from "iconv-lite";
const config = global.covid19map.config;
const ALTER_CITY_NAMES = [['県南', '白河市']];
function parse_html( cr )
{
  const rootm = iconv.decode( cr.data, 'UTF8' ).match( /<table[\s\S]+?新型コロナウイルス発生状況一覧[\s\S]+?<tbody>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    throw new Error( "no table in fukushima" );
  const csv = [];
  for ( const block of rootm[ 1 ].match( /<tr.*?>[\s\S]+?<\/tr>/g ) )
  {
    //                             通し番号                                           日付                                   居住地
    const m = block.match( /^<tr[\s\S]+?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?((\d+)年)?(\d+)月(\d+)日[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>/ );
    if ( !m )
      continue;
    const cm = m[ 5 ].match( /[(（]([^)）]+)/ );
    const city = (cm && cm[ 1 ]) || m[ 5 ];
    const year = (m[ 2 ] && parseInt( m[ 2 ] )) || new Date().getFullYear();
    const d = new Date( year + ((year < 2000) ? 2018 : 0), parseInt( m[ 3 ] ) - 1, parseInt( m[ 4 ] ) );
    csv.push( [ d, city.trim() ] );
  }
  return csv.sort( (a, b) => a[ 0 ].getTime() - b[ 0 ].getTime() );
}

export default class PoiFukushima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福島県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUSHIMA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
