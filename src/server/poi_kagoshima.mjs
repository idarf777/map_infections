import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from './logger.mjs';
const config = global.covid19map.config;

async function parse_html( html )
{
  const rootm = html.match( /鹿児島県内での発生状況[\s\S]+?<tbody>[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    throw new Error( "no table in kagoshima" );
  const rows = rootm[ 1 ];
  const csv = [];
  const re = /[\s\S]*?<tr>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g; // セルは最低3つある
  const prevs = [
    { rowspan: 0, value: 0 },
    { rowspan: 0, value: new Date() },
    { rowspan: 0, value: '' }
  ];
  while ( true )
  {
    const m = re.exec( rows );
    if ( !m )
      break;
    let cur = 1;
    prevs.forEach( (p, i) => {
      if ( p.rowspan > 1 )
      {
        p.rowspan--;
      }
      else
      {
        let token = m[ cur++ ];
        const ms = token && token.match( /rowspan="(\d+)"/ );
        if ( ms )
          p.rowspan = parseInt( ms[ 1 ] );
        token = m[ cur++ ];

        let mc, val;
        switch ( i )
        {
        case 0:
          mc = token.match( /(\d+)/ );
          val = mc && parseInt( mc[ 1 ] );
          break;
        case 1:
          mc = token.match( /((\d+)年)?(\d+)月(\d+)日/ );
          if ( mc )
          {
            const year = mc[ 2 ] ? parseInt( mc[ 2 ] ) : new Date().getFullYear();
            val = new Date( `${(year > 2000) ? year : (year + 2018)}-${mc[ 3 ]}-${mc[ 4 ]}` );
          }
          break;
        case 2:
          val = token.replace( /&nbsp;|[\s]/g, '' );
          break;
        default:
          break;
        }
        prevs[ i ].value = val || prevs[ i ].value;
      }
    } );

    if ( !prevs[ 2 ].value.match( />.*?[ー-－─]|欠番/ ) )  // 取り消し線っぽい
      csv.push( [ prevs[ 1 ].value, prevs[ 2 ].value ] );
  }
  return csv;
}
export default class PoiKagoshima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '鹿児島県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.KAGOSHIMA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
