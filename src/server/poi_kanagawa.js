import agh from "agh.sprintf";
import axios from "axios";
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring } from "../util.js";

const poi_kanagawa = [
  [35.4408333333333,139.641215277778,'横浜市'],
  [35.5051041666667,139.685694444444,'横浜市鶴見区'],
  [35.4737847222222,139.632604166667,'横浜市神奈川区'],
  [35.4503472222222,139.620138888889,'横浜市西区'],
  [35.4414583333333,139.645381944444,'横浜市中区'],
  [35.4311805555556,139.630729166667,'横浜市南区'],
  [35.4565972222222,139.599166666667,'横浜市保土ケ谷区'],
  [35.3990972222222,139.621631944444,'横浜市磯子区'],
  [35.3348263888889,139.627673611111,'横浜市金沢区'],
  [35.5157291666667,139.63625,'横浜市港北区'],
  [35.3967708333333,139.536736111111,'横浜市戸塚区'],
  [35.3976041666667,139.595763888889,'横浜市港南区'],
  [35.4714236111111,139.547986111111,'横浜市旭区'],
  [35.5092361111111,139.541284722222,'横浜市緑区'],
  [35.4627777777778,139.502048611111,'横浜市瀬谷区'],
  [35.3610763888889,139.557291666667,'横浜市栄区'],
  [35.4145486111111,139.491944444444,'横浜市泉区'],
  [35.5495833333333,139.540243055556,'横浜市青葉区'],
  [35.5416319444444,139.573854166667,'横浜市都筑区'],
  [35.5265625,139.705590277778,'川崎市'],
  [35.5264236111111,139.707083333333,'川崎市川崎区'],
  [35.54125,139.690138888889,'川崎市幸区'],
  [35.5730555555556,139.658923611111,'川崎市中原区'],
  [35.5961805555556,139.611215277778,'川崎市高津区'],
  [35.6163194444444,139.565381944444,'川崎市多摩区'],
  [35.5858680555556,139.581909722222,'川崎市宮前区'],
  [35.6004861111111,139.508958333333,'川崎市麻生区'],
  [35.568125,139.376284722222,'相模原市'],
  [35.5924305555556,139.340833333333,'相模原市緑区'],
  [35.568125,139.376284722222,'相模原市中央区'],
  [35.5271180555556,139.433541666667,'相模原市南区'],
  [35.2780555555556,139.675277777778,'横須賀市'],
  [35.3318402777778,139.352847222222,'平塚市'],
  [35.3159027777778,139.550034722222,'鎌倉市'],
  [35.3355902777778,139.494409722222,'藤沢市'],
  [35.2613541666667,139.155416666667,'小田原市'],
  [35.3305555555556,139.406666666667,'茅ケ崎市'],
  [35.2923263888889,139.583645833333,'逗子市'],
  [35.1408680555556,139.623958333333,'三浦市'],
  [35.3714236111111,139.223333333333,'秦野市'],
  [35.4398263888889,139.365694444444,'厚木市'],
  [35.4842708333333,139.461215277778,'大和市'],
  [35.3997222222222,139.318159722222,'伊勢原市'],
  [35.4431944444444,139.393993055556,'海老名市'],
  [35.4853819444444,139.410868055556,'座間市'],
  [35.3173611111111,139.1028125,'南足柄市'],
  [35.4339236111111,139.429618055556,'綾瀬市'],
  [35.2688194444444,139.589409722222,'葉山町'],
  [35.3697569444444,139.387118055556,'寒川町'],
  [35.3035763888889,139.314513888889,'大磯町'],
  [35.2962152777778,139.258715277778,'二宮町'],
  [35.3274652777778,139.221979166667,'中井町'],
  [35.3234027777778,139.159756944444,'大井町'],
  [35.3448958333333,139.142569444444,'松田町'],
  [35.3573263888889,139.086979166667,'山北町'],
  [35.3331597222222,139.126354166667,'開成町'],
  [35.2290972222222,139.110069444444,'箱根町'],
  [35.1551388888889,139.140277777778,'真鶴町'],
  [35.1446180555556,139.111458333333,'湯河原町'],
  [35.5255555555556,139.324965277778,'愛川町'],
  [35.4791319444444,139.279513888889,'清川村']
];
const map_poi = new Map();
for ( const poi of poi_kanagawa )
  map_poi.set( poi[ 2 ], [ poi[ 1 ], poi[ 0 ] ] );

async function load_csv()
{
  return axios.get( config.KANAGAWA_CSV.DATA_URI );
}
export default async function load_kanagawa_poi()
{
  Log.debug( 'getting kanagawa CSV...' );
  const csv = await load_csv();

  Log.debug( 'parsing CSV...' );
  const map_city_infectors = new Map();
  const rows = await parse_csv( csv, { columns: true } );
  const first_at = new Date( rows[ 0 ][ 0 ] );
  let date;
  for ( const row of rows )
  {
    if ( row.length < 3 )
      break;
    date = new Date( row[ 0 ] );
    if ( date.getTime() < config.KANAGAWA_CSV.DATA_BEGIN_AT.getTime() )
      continue;
    const city = row[ 1 ].replace( /^神奈川県/g, '' ).replace( /保健福祉事務所管内$/g, '市' ).replace( /保健所管内$/g, '' );
    if ( !map_city_infectors.has( city ) )
      map_city_infectors.set( city, new Map() );
    const map_inf = map_city_infectors.get( city );
    map_inf.set( date.getTime(), (map_inf.get( date.getTime() ) || 0) + 1 );
  }
  return {
    begin_at: datetostring( first_at.getTime() ),
    finish_at: datetostring( (date || first_at).getTime() ),
    spots: Array.from( map_city_infectors.entries() ).map( pair => {
      const geopos = map_poi.get( pair[ 0 ] );
      if ( !geopos )
        throw 'bad city name';
      return {
        geopos,
        name: `神奈川県${pair[ 0 ]}`,
        data: Array.from( pair[ 1 ].keys() ).sort().map( tm => {
          return { date: datetostring( tm ), infectors: pair[ 1 ].get( tm ) }
        } )
      };
    } )
  };
}
