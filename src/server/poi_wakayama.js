import Log from "../logger";
import {datetostring, parse_csv, sanitize_poi_name} from "../util";
import DbPoi from "./db_poi";
import iconv from "iconv-lite";
import axios from "axios";
import {config} from "../config";
import xlsx from "xlsx";
import BasePoi from "./base_poi";

async function load_csv()
{
  const response = await axios.create( { 'responseType': 'arraybuffer' } ).get( config.WAKAYAMA_CSV.DATA_URI );
  const html = iconv.decode( response.data, 'UTF8' );
  const rows = await parse_csv( html );
  const csv = [];
  for ( let colnum=1; ; colnum++ )  // なぜか列方向に並んでいる
  {
    const d = rows[ 2 ][ colnum ];
    if ( !d || d === '' )
      break;
    const date = new Date( d );
    const infectors = Math.floor( parseFloat( rows[ 4 ][ colnum ] ) );
    for ( let i=0; i<infectors; i++ )
      csv.push( [ date, '' ] ); // 市区町村名は提供されていない
  }
  return csv;
}
export default class PoiWakayama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '和歌山県',
      cb_load_csv: () => load_csv(),
      cb_parse_csv: cr => cr,
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
