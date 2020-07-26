import axios from "axios";
import xlsx from 'xlsx';
import {config} from "../config.js";
import Log from "../logger.js";
import BasePoi from "./base_poi.js";

async function load_xlsx()
{
  const response = await axios.create( { 'responseType': 'arraybuffer' } ).get( config.CHIBA_XLS.DATA_URI );
  const book = xlsx.read( response.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 2; row < rows; row++ )
  {
    const cellDate = worksheet[ `A${row}` ];
    const cellCity = worksheet[ `C${row}` ];
    if ( cellDate?.t !== 'd' || cellCity?.t !== 's' )
      break;
    csv.push( [ cellDate.v, cellCity.v ] );
  }
  return csv;
}
export default class PoiChiba extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '千葉県',
      cb_load_csv: () => load_xlsx(),
      cb_parse_csv: cr => cr,
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
