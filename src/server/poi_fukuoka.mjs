import BasePoi from "./base_poi.mjs";
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import iconv from "iconv-lite";
import Log from './logger.mjs';
import {axios_instance, parse_csv} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['福岡市内', '福岡市'],
  ['久留米市内', '久留米市'],
  ['小倉北区', '北九州市'],
  ['糟屋郡', '粕屋町' ],
  ['京都郡', '苅田町' ],
  ['八女郡', '広川町' ],
  ['遠賀郡', '遠賀町' ],
  ['嘉穂郡', '桂川町' ],
  ['築上郡', '築上町' ],
  ['田川郡', '香春町' ],
  ['朝倉郡', '筑前町' ],
  ['三井郡', '大刀洗町' ],
  ['鞍手郡', '鞍手町' ],
  ['三潴郡', '大木町' ]
];

// linkタグのJSを全て読んでデータを探す
async function parse_html( html )
{
  const dom = new JSDOM( html );
  for ( const tag of dom.window.document.querySelectorAll( 'a' ) )
  {
    if ( !tag.textContent.match( /ダウンロードする/ ) )
      continue;
    //const uri = complement_uri( tag.href );
    const uri = tag.href;
    Log.info( `loading ${uri}...` );
    const cr = await axios_instance({ responseType: 'arraybuffer' }).get( uri ).catch( err => Log.error(err));
    return parse_csv( iconv.decode( cr.data, 'UTF8' ));
  }
  throw new Error( "no valid data on fukuoka-pref" );
}

export default class PoiFukuoka extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '福岡県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.FUKUOKA_CSV.DATA_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
      //csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 8,
      col_date: 4,
      col_city: 7
    } );
  }
}
