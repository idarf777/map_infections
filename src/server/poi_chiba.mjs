import xlsx from 'xlsx';
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

async function parse_xlsx( cr )
{
  const book = xlsx.read( cr.data, { cellDates: true } );
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
      csv_uri: config.CHIBA_XLS.DATA_URI,
      cb_parse_csv: cr => parse_xlsx( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
