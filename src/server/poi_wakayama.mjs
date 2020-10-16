import iconv from "iconv-lite";
import BasePoi from "./base_poi.mjs";
import {axios_instance, parse_csv} from "./util.mjs";
import Log from "./logger.mjs";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
const config = global.covid19map.config;
const ALTER_CITY_NAMES = [
  ['県内', ''], ['和歌山', '和歌山市'],
  ['田辺保健所管内', '田辺市'],['岩出保健所管内', '岩出市'],['海南保健所管内', '海南市'],['橋本保健所管内', '橋本市'],['湯浅保健所管内', '湯浅町'],['御坊保健所管内', '御坊市'],['新宮保健所管内', '新宮市'],
];

// HTTP(S)のURIを補完する
function complement_uri( uri )
{
  if ( !uri.match( /^https?:\/\// ) )
  {
    const host = config.WAKAYAMA_CSV.INDEX_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+\/)/ )[ 1 ];
    uri = `${host}${uri}`;
  }
  return uri;
}

// linkタグのJSを全て読んでデータを探す
async function parse_html( html )
{
  const dom = new JSDOM( html );
  for ( const tag of dom.window.document.querySelectorAll( 'link' ) )
  {
    if ( !tag.href.match( /^\/_nuxt\/.+?\.js$/ ) )
      continue;
    const uri = complement_uri( tag.href );
    Log.info( `loading ${uri}...` );
    const js = (await axios_instance().get( uri )).data;
    const re = /JSON\.parse\(\s*['"]({\s*"contacts".+?})['"]\)/;
    while ( true )
    {
      const jsm = re.exec( js );
      if ( !jsm )
        break;
      try
      {
        const json = JSON.parse( jsm[ 1 ] );
        if ( !json.patients )
          continue;
        return json.patients.data.map( h => {
          let city = h[ '居住地' ].match( /^([^:：(（]+)[:(]?/ )[ 1 ].trim();
          const cm = city.match( /^(.+?管内)の/ );
          if ( cm )
            city = cm[ 1 ];
          return [ new Date( h[ 'date' ] ), city ]
        } );
      }
      catch ( e )
      {
        break;
      }
    }
  }
  throw new Error( "no valid data on wakayama-pref" );
}

export default class PoiWakayama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '和歌山県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.WAKAYAMA_CSV.INDEX_URI,
      cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
