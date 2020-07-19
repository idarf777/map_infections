import agh from "agh.sprintf";
import axios from "axios";
import xlsx from 'xlsx';
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring } from "../util.js";

const poi_chiba = {
  '千葉市': [35.6040625,140.109652777778],
  '千葉市中央区': [35.6056597222222,140.127847222222],
  '千葉市花見川区': [35.6596180555556,140.072291666667],
  '千葉市稲毛区': [35.6328819444444,140.110347222222],
  '千葉市若葉区': [35.6306597222222,140.1590625],
  '千葉市緑区': [35.5571875,140.179409722222],
  '千葉市美浜区': [35.6372222222222,140.066319444444],
  '銚子市': [35.7313888888889,140.830034722222],
  '市川市': [35.7101388888889,139.931006944444],
  '船橋市': [35.6913194444444,139.985763888889],
  '館山市': [34.9932291666667,139.873229166667],
  '木更津市': [35.3823611111111,139.939479166667],
  '松戸市': [35.7844097222222,139.906458333333],
  '野田市': [35.9519097222222,139.878055555556],
  '茂原市': [35.4251388888889,140.291354166667],
  '成田市': [35.7734375,140.322152777778],
  '佐倉市': [35.7203819444444,140.227222222222],
  '東金市': [35.5566319444444,140.369375],
  '旭市': [35.7171875,140.649930555556],
  '習志野市': [35.6782291666667,140.030520833333],
  '柏市': [35.864375,139.9790625],
  '勝浦市': [35.1489583333333,140.324201388889],
  '市原市': [35.4948611111111,140.118611111111],
  '流山市': [35.8530902777778,139.9059375],
  '八千代市': [35.7192013888889,140.103055555556],
  '我孫子市': [35.8609027777778,140.031493055556],
  '鴨川市': [35.1107291666667,140.102048611111],
  '鎌ケ谷市': [35.7735416666667,140.0040625],
  '君津市': [35.3271875,139.905729166667],
  '富津市': [35.3008333333333,139.860347222222],
  '浦安市': [35.6498958333333,139.905104166667],
  '四街道市': [35.6664583333333,140.17125],
  '袖ケ浦市': [35.4265972222222,139.957604166667],
  '八街市': [35.6626736111111,140.321423611111],
  '印西市': [35.8291319444444,140.1490625],
  '白井市': [35.7882638888889,140.0596875],
  '富里市': [35.7235069444444,140.346111111111],
  '南房総市': [35.0398958333333,139.843333333333],
  '匝瑳市': [35.7046180555556,140.567638888889],
  '香取市': [35.8944791666667,140.502569444444],
  '山武市': [35.5997222222222,140.416840277778],
  'いすみ市': [35.250625,140.388263888889],
  '大網白里市': [35.5184375,140.324236111111],
  '酒々井町': [35.7215625,140.2728125],
  '栄町': [35.8376388888889,140.247152777778],
  '神崎町': [35.8983680555556,140.408611111111],
  '多古町': [35.7322916666667,140.470972222222],
  '東庄町': [35.8339236111111,140.671909722222],
  '九十九里町': [35.5317708333333,140.443576388889],
  '芝山町': [35.6898263888889,140.417465277778],
  '横芝光町': [35.6622916666667,140.507638888889],
  '一宮町': [35.3693402777778,140.371944444444],
  '睦沢町': [35.3578125,140.322604166667],
  '長生村': [35.4088888888889,140.357326388889],
  '白子町': [35.4511111111111,140.3775],
  '長柄町': [35.4278472222222,140.230347222222],
  '長南町': [35.3831597222222,140.240451388889],
  '大多喜町': [35.281875,140.248680555556],
  '御宿町': [35.1881597222222,140.351979166667],
  '鋸南町': [35.1077777777778,139.838784722222]
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
  if ( spots.length === 0 )
    return {};
  const tms = spots.map( spot => new Date( spot.data[ 0 ].date ) ).sort();
  return { begin_at: datetostring( tms[ 0 ] ), finish_at: datetostring( tms[ tms.length - 1 ] ), spots };
}
