import agh from "agh.sprintf";
import axios from "axios";
import xlsx from 'xlsx';
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring } from "../util.js";

const poi_chiba = {
  '千葉市': [140.109652777778,35.6040625],
  '千葉市中央区': [140.127847222222,35.6056597222222],
  '千葉市花見川区': [140.072291666667,35.6596180555556],
  '千葉市稲毛区': [140.110347222222,35.6328819444444],
  '千葉市若葉区': [140.1590625,35.6306597222222],
  '千葉市緑区': [140.179409722222,35.5571875],
  '千葉市美浜区': [140.066319444444,35.6372222222222],
  '銚子市': [140.830034722222,35.7313888888889],
  '市川市': [139.931006944444,35.7101388888889],
  '船橋市': [139.985763888889,35.6913194444444],
  '館山市': [139.873229166667,34.9932291666667],
  '木更津市': [139.939479166667,35.3823611111111],
  '松戸市': [139.906458333333,35.7844097222222],
  '野田市': [139.878055555556,35.9519097222222],
  '茂原市': [140.291354166667,35.4251388888889],
  '成田市': [140.322152777778,35.7734375],
  '佐倉市': [140.227222222222,35.7203819444444],
  '東金市': [140.369375,35.5566319444444],
  '旭市': [140.649930555556,35.7171875],
  '習志野市': [140.030520833333,35.6782291666667],
  '柏市': [139.9790625,35.864375],
  '勝浦市': [140.324201388889,35.1489583333333],
  '市原市': [140.118611111111,35.4948611111111],
  '流山市': [139.9059375,35.8530902777778],
  '八千代市': [140.103055555556,35.7192013888889],
  '我孫子市': [140.031493055556,35.8609027777778],
  '鴨川市': [140.102048611111,35.1107291666667],
  '鎌ケ谷市': [140.0040625,35.7735416666667],
  '君津市': [139.905729166667,35.3271875],
  '富津市': [139.860347222222,35.3008333333333],
  '浦安市': [139.905104166667,35.6498958333333],
  '四街道市': [140.17125,35.6664583333333],
  '袖ケ浦市': [139.957604166667,35.4265972222222],
  '八街市': [140.321423611111,35.6626736111111],
  '印西市': [140.1490625,35.8291319444444],
  '白井市': [140.0596875,35.7882638888889],
  '富里市': [140.346111111111,35.7235069444444],
  '南房総市': [139.843333333333,35.0398958333333],
  '匝瑳市': [140.567638888889,35.7046180555556],
  '香取市': [140.502569444444,35.8944791666667],
  '山武市': [140.416840277778,35.5997222222222],
  'いすみ市': [140.388263888889,35.250625],
  '大網白里市': [140.324236111111,35.5184375],
  '酒々井町': [140.2728125,35.7215625],
  '栄町': [140.247152777778,35.8376388888889],
  '神崎町': [140.408611111111,35.8983680555556],
  '多古町': [140.470972222222,35.7322916666667],
  '東庄町': [140.671909722222,35.8339236111111],
  '九十九里町': [140.443576388889,35.5317708333333],
  '芝山町': [140.417465277778,35.6898263888889],
  '横芝光町': [140.507638888889,35.6622916666667],
  '一宮町': [140.371944444444,35.3693402777778],
  '睦沢町': [140.322604166667,35.3578125],
  '長生村': [140.357326388889,35.4088888888889],
  '白子町': [140.3775,35.4511111111111],
  '長柄町': [140.230347222222,35.4278472222222],
  '長南町': [140.240451388889,35.3831597222222],
  '大多喜町': [140.248680555556,35.281875],
  '御宿町': [140.351979166667,35.1881597222222],
  '鋸南町': [139.838784722222,35.1077777777778]
};

async function load_xlsx()
{
  const response = await axios.create( { 'responseType': 'arraybuffer' } ).get( config.CHIBA_XLS.DATA_URI );
  const book = xlsx.read( response.data, { cellDates: true } );
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
export default async function load_chiba_poi()
{
  Log.debug( 'getting chiba XLSX...' );
  const rows = await load_xlsx();
  const map_city_infectors = new Map();
  for ( let rownum=0; rownum < rows.length; rownum++ )
  {
    const date = rows[ rownum ][ 0 ];
    const city = rows[ rownum ][ 1 ];
    if ( !poi_chiba[ city ] )
      continue;
    if ( !map_city_infectors.get( city ) )
      map_city_infectors.set( city, new Map() );
    const map_inf = map_city_infectors.get( city );
    map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
  }

  const spots = Array.from( map_city_infectors.entries() ).map( pair => {
    let subtotal = 0;
    return {
      geopos: poi_chiba[ pair[ 0 ] ],
      name: `千葉県${pair[ 0 ]}`,
      data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
        const infectors = pair[ 1 ].get( tm );
        subtotal += infectors;
        return ( tm >= config.CHIBA_XLS.DATA_BEGIN_AT.getTime() ) && { date: datetostring( tm ), infectors, subtotal }
      } ).filter( e => e )
    };
  } );
  Log.debug( 'parsed chiba XLSX' );
  if ( spots.length === 0 )
    return {};
  const tms = spots.map( spot => ((spot.data?.length || 0) > 0) && new Date( spot.data[ 0 ].date ) ).filter( e => e ).sort();
  return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
}
