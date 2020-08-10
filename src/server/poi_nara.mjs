import xlsx from 'xlsx';
import { sanitize_poi_name } from "./util.mjs";
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['奈良県内', ''], ['郡山保健所管内', '大和郡山市'], ['中和保健所管内', '大和高田市']];
async function parse_xlsx( cr )
{
  const book = xlsx.read( cr.data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 3; row < rows; row++ )
  {
    const cellDate = worksheet[ `D${row}` ];
    const cellCity = worksheet[ `F${row}` ];
    if ( cellDate?.t !== 'd' || cellCity?.t !== 's' )
      break;
    csv.push( [ cellDate.v, sanitize_poi_name( cellCity.v ) ] );
  }
  return csv;
}
export default class PoiNara extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '奈良県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.NARA_XLS.DATA_URI,
      cb_parse_csv: cr => parse_xlsx( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
