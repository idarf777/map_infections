import {config} from "../config.js";
import BasePoi from "./base_poi.js";
import axios from "axios";
import iconv from "iconv-lite";
import {datetostring, parse_csv} from "../util";

const ALTER_CITY_NAMES = [['府内', ''], ['京都府内', ''], ['京都市内', '京都市'], ['乙訓管内', '長岡京市'], ['山城管内', '宇治市'], ['丹後管内', '京丹後市'], ['南丹管内', '亀岡市'], ['中丹管内', '福知山市']];
async function parse_html( html )
{
  const csv = [];
  const re = /<tr>\s*<td>\d+例目<\/td>\s*<td>(.*?)<\/td>\s*<td>.*?<\/td>\s*<td>.*?<\/td>\s*<td>(.*?)<\/td>/g;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const date = m[ 1 ];
    const city = m[ 2 ];
    const dm = date.match( /(.+?)(\d+)年(\d+)月(\d+)日/ );
    if ( !dm || dm[ 1 ] !== '令和' )
      continue;
    csv.push( [ datetostring( new Date( parseInt( dm[ 2 ] ) + 2018, parseInt( dm[ 3 ] ), parseInt( dm[ 4 ] ) ) ), city ] );
  }
  return csv;
}
export default class PoiKyoto extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '京都府',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.KYOTO_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
