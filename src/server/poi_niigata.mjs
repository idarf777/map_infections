import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['柏崎保健所管内', '柏崎市'], ['三条保健所管内', '三条市']];
function parse_html( cr )
{
  const rootm = iconv.decode( cr.data, 'UTF8' ).match( /県内における感染者の発生状況[\s\S]+?<tbody>[\s\S]*?(<tr[\s\S]+?)<\/tbody>/ );
  const html = rootm && rootm[ 1 ];
  if ( !html )
    throw new Error( "not matched in 新潟県" );
  const csv = [];
  //                            通し番号                         何例目                         日付                          年齢                         性別                         居住地
  const re = /<tr>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]*?)<\/td>[\s\S]*?<td.*?>([\s\S]+?)<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>[\s\S]*?<\/td>[\s\S]*?<td.*?>([\s\S]+?)<\/td>[\s\S]*?<\/tr>/g;
  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const mark = m[ 1 ];
    const date = m[ 2 ];
    const city = m[ 3 ];
    const mm = mark.match( /(<a .+?>)?(.+?)</ );
    if ( !mm )
      continue;
    const rootcity = mm[ 2 ].trim();
    const dm = date.trim().match( /((\d+)年)?(\d+)月(\d+)日/ );
    if ( !dm )
      continue;
    let year = new Date().getFullYear();
    if ( dm[ 2 ] )
    {
      year = parseInt( dm[ 2 ] );
      if ( year < 2000 )
        year += 2018; // 令和
    }
    const cm = city.match( /[(（](.+?)[)）]/ );
    let livein = cm ? cm[ 1 ] : city;
    if ( livein.match( /内滞在中/ ) )
      livein = rootcity;
    csv.push( [ new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) ), livein ] );
  }
  return csv;
}
export default class PoiNiigata extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '新潟県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.NIIGATA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( cr ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

