import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import {parse_csv} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['胆振総合振興局管内', '苫小牧市'],
  ['上川総合振興局管内', '富良野市'],
  ['石狩振興局管内', '札幌市'],
  ['オホーツク総合振興局管内', '網走市'],
  ['ｵﾎｰﾂｸ総合振興局管内', '網走市'],
  ['釧路総合振興局管内', '釧路市'],
  ['釧路総合振興局', '釧路市'],
  ['十勝総合振興局管内', '帯広市'],
  ['十勝総合振興局', '帯広市'],
  ['空知総合振興局管内', '岩見沢市'],
  ['宗谷総合振興局管内', '稚内市'],
  ['宗谷総合誌振興局管内', '稚内市'],  // 誤字
  ['後志総合振興局', '小樽市'],
  ['後志総合振興局管内', '小樽市'],
  ['日高振興局管内', '日高町'],
  ['日高振興局', '日高町'],
  ['渡島総合振興局管内', '函館市'],
  ['檜山振興局管内', '江差町'],
  ['留萌振興局管内', '留萌市'],
  ['根室振興局管内', '根室市'],
];

const EX_COLUMNS = [
  "道外他",
  "非公表",
];
const COLUMN_MAP = [
  ["空知", "空知総合振興局管内"],
  ["石狩", "石狩振興局管内"],
  ["後志", "後志総合振興局管内"],
  ["胆振", "胆振総合振興局管内"],
  ["日高", "日高振興局管内"],
  ["渡島", "渡島総合振興局管内"],
  ["檜山", "檜山振興局管内"],
  ["上川", "上川総合振興局管内"],
  ["留萌", "留萌振興局管内"],
  ["宗谷", "宗谷総合振興局管内"],
  ["オホーツク", "オホーツク総合振興局管内"],
  ["十勝", "十勝総合振興局管内"],
  ["釧路", "釧路総合振興局管内"],
  ["根室", "根室振興局管内"],
];
const COLUMN_NAMES = COLUMN_MAP.map( v => v[ 0 ] ).concat( EX_COLUMNS );
const columnMap = new Map();
COLUMN_MAP.forEach( v => columnMap.set( v[ 0 ], v[ 1 ] ) );

async function convert_csv( data ){
  const csv = [];
  const rows = await parse_csv( iconv.decode( data, 'CP932' ) );
  const places = new Map();
  for ( let i=1; ; i++ )
  {
    if ( !COLUMN_NAMES.includes( rows[ 0 ][ i ] ) )
      break;
    places.set( i, rows[ 0 ][ i ] );
  }
  const columns = Array.from( places.keys() ).sort( (a,b) => (a < b) ? 0 : 1 );
  for ( let r = 1; r < rows.length; r++ )
  {
    const row = rows[ r ];
    if ( row == null || row.length < 19 || row[ 0 ] === '' )
      continue;
    const date = new Date( row[ 0 ] );
    for ( let c = 0; c < columns.length; c++ )
    {
      const col = parseInt( row[ columns[ c ] ] || '0' );
      const place = places.get( columns[ c ] );
      for ( let v = 0; v < col; v++ )
        csv.push( [ date, `${columnMap.get( place ) || place}` ] );
    }
  }
  return csv;
}

export default class PoiHokkaido extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '北海道',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.HOKKAIDO_CSV.DATA_URI,
      csv_encoding: 'CP932',
      cb_parse_csv: cr => convert_csv( cr.data ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}
