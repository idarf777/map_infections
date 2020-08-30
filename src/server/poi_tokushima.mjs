import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
const config = global.covid19map.config;

//const ALTER_CITY_NAMES = [['府内', ''], ['京都府内', ''], ['京都市内', '京都市'], ['乙訓管内', '長岡京市'], ['山城管内', '宇治市'], ['丹後管内', '京丹後市'], ['南丹管内', '亀岡市'], ['中丹管内', '福知山市']];
async function parse_html( html )
{
  const csv = [];
//  const re = /<tr>\s*<td>\s*\d+例目\s*<\/td>\s*<td>(.*?)<\/td>\s*<td>.*?<\/td>\s*<td>.*?<\/td>\s*<td>(.*?)<\/td>/g;
//  const re = /<\/tr><tr><th style="" scope="row">\d+例目\s*<\/th>\s(.*?)\s*<\/td>.*?<\/td>.*?<\/td>/g;
//  const re = /scope=\"row\">\s*(\d+)例目\s*<\/th>\s*(.*)\s*(\d+.\d+.)/g;
  const re = /scope=\"row\">\s*(\d+)例目\s*<\/th>\s*(.*)\s*(\d+.\d+.)\s*<\/td>/g;

  while ( true )
  {
    const m = re.exec( html );
    if ( !m )
      break;
    const date = m[ 3 ]; 
//    const city = m[ 2 ];
    const city = '徳島県';
//    const dm = date.trim().match( /(.+?)(\d+)年(\d+)月(\d+)日/ );  //令和2年8月25日"
    const dm = date.trim().match( /(\d+)月(\d+)日/ );    //2月25日
    if ( !dm || !dm[ 1 ].match( /\d+/ ) )
      continue;
//    csv.push( [ new Date( parseInt( dm[ 2 ] ) + 2018, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) ), city ] );
    csv.push( [ new Date( 2020, parseInt( dm[ 1 ] ) - 1, parseInt( dm[ 2 ] ) ), city ] );

  }
  return csv;
}
export default class PoiTokushima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '徳島県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.TOKUSHIMA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
