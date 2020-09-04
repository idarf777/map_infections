import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import encoding from 'encoding-japanese';
import axios from "axios";
import {parse_csv} from "./util.mjs";

const config = global.covid19map.config;

//const ALTER_CITY_NAMES = [
//];
async function parse_html_then_get_csv( html ){
  const detected = encoding.detect(html);
  const hText = iconv.decode(html, detected);
  const re = /[\r\n|\r|\n] +?<li>[\r\n|\r|\n] +?<a class=\"btn btn-primary resource-url-analytics resource-type-None\" href=\"(.+?)\"/;  
  const csv_url = re.exec(hText);
  const csv_rd = await (axios.create( {'responseType':'arraybuffer'} ).get(csv_url[1]) );
  const detected_1 = encoding.detect(csv_rd.data);
  const csv = await parse_csv( iconv.decode(csv_rd.data, detected_1) );

  return csv;
}

export default class PoiNagasaki extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '長崎県',
//      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.NAGASAKI_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html_then_get_csv( cr.data ),
//      csv_encoding: 'CP932',
//      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 6,
      col_date: 4,
      col_city: 3
    } );
  }
}
