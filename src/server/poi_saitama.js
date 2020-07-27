import axios from "axios";
import {config} from "../config.js";
import Log from "../logger.js";
import BasePoi from "./base_poi.js";

async function load_csv()
{
  const resIndex = await axios.get( config.SAITAMA_CSV.INDEX_URI );
  const lastLinkIndex = resIndex.data.lastIndexOf( config.SAITAMA_CSV.SEARCH_KEY );
  if ( lastLinkIndex < 0 )
    throw new Error( "bad html" );
  const uri = resIndex.data.substring( lastLinkIndex ).match( /^<a href="([^"]+)"/ )[ 1 ];
  if ( !uri )
    throw new Error( "bad link" );
  return axios.create( { 'responseType': 'arraybuffer' } ).get( uri );
}
export default class PoiSaitama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '埼玉県',
      cb_load_csv: () => load_csv(),
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 5,
      col_date: 0,
      cb_date: row => new Date( row[ 1 ] ),
      col_city: 4
    } );
  }
}
