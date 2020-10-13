import xlsx from 'xlsx';
import {axios_instance, sanitize_poi_name} from "./util.mjs";
import BasePoi from "./base_poi.mjs";
import jsdom from "jsdom";
import iconv from "iconv-lite";
const config = global.covid19map.config;
const { JSDOM } = jsdom;

const ALTER_CITY_NAMES = 
[
  ['伊丹健康福祉事務所管内',  '伊丹市'],
  ['龍野健康福祉事務所管内',  'たつの市'],
  ['加東健康福祉事務所管内',  '加東市'],
  ['加古川健康福祉事務所管内','加古川市'],
  ['加古川健康事務所管内',    '加古川市'],
  ['宝塚健康福祉事務所管内',  '宝塚市'],
  ['洲本健康福祉事務所管内',  '洲本市'],
  ['豊岡健康福祉事務所管内',  '豊岡市'],
  ['赤穂健康福祉事務所管内',  '赤穂市'],
  ['中播磨健康福祉事務所管内','姫路市'],
  ['朝来健康福祉事務所管内',  '朝来市'],
  ['丹波健康福祉事務所管内',  '丹波市'],
  ['芦屋健康福祉事務所管内',  '芦屋市'],

];
async function parse_xlsx( cr )
{
  const book = xlsx.read( (await cr).data, { cellDates: true } );
  const worksheet = book.Sheets[ book.SheetNames[ 0 ] ];
  const range = worksheet['!ref'];
  const rows = parseInt( range.match( /^.+:[A-z]+(\d+)$/ )[ 1 ] );
  const csv = [];
  for ( let row = 8; row < rows; row++ )
  {
    const cellDate = worksheet[ `C${row}` ];
    const cellCity = worksheet[ `G${row}` ];
    if ( cellDate?.t !== 'd' || cellCity?.t !== 's' )
    {
      if ( cellDate?.t === 's' && cellDate.v.match( /欠番/ ) )
        continue;
      break;
    }
    csv.push( [ cellDate.v, sanitize_poi_name( cellCity.v ) ] );
  }
  return csv;
}
async function parse_html( html )
{
  const dom = new JSDOM( html );
  let uri = null;
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( tag.textContent.match( /新型コロナウイルスに感染した患者の状況.+?エクセル/ ) )
    {
      uri = tag.href;
      break;
    }
  }
  if ( !uri )
    throw new Error( "no xlsx link in hyogo" );
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.HYOGO_XLS.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return axios_instance( { responseType: 'arraybuffer' } ).get( uri );
}
export default class PoiHyogo extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '兵庫県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.HYOGO_XLS.INDEX_URI,
      cb_parse_csv: cr => parse_xlsx( parse_html( iconv.decode( cr.data, 'UTF8' ) ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
