import axios from "axios";
import xlsx from 'xlsx';
import {config} from "../config.js";
import Log from "../logger.js";
import { sanitize_poi_name } from "../util.js";
import BasePoi from "./base_poi.js";

const ALTER_CITY_NAMES = [['峡南地域', '身延町'], ['中北地域', '甲府市']];
async function parse_xlsx( cr )
{
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 2; row < rows; row++ )
  {
    const cellDate = worksheet[ `D${row}` ];
    const cellPref = worksheet[ `C${row}` ];
    const cellCity = worksheet[ `H${row}` ];
    if ( cellDate?.t !== 'd' || cellCity?.t !== 's' || cellPref?.t !== 's' )
      break;
    if ( cellPref.v !== '山梨県' )
      continue;
    let city = cellCity.v.replace( /\s/g, ' ' ).replace( /（/g, '(' ).replace( /）/g, ')' );
    if ( city.indexOf( '(' ) >= 0 )
      city = city.match( /^.+?\((.+?)[,、　\s)]/ )[ 1 ]; // 最初の居住地だけをとる
    csv.push( [ cellDate.v, sanitize_poi_name( city ) ] );
  }
  return csv;
}
export default class PoiYamanashi extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '山梨県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.YAMANASHI_XLS.DATA_URI,
      cb_parse_csv: cr => parse_xlsx( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
