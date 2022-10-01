import BasePoi from "./base_poi.mjs";
import path from "path";
import mkdirp from "mkdirp";
import {promises as fs} from "fs";
import Log from "./logger.mjs";
import {axios_instance} from "./util.mjs";
import agh from "agh.sprintf";
import iconv from "iconv-lite";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['県南地域', 'つくば市'], ['竜ケ崎保健所管内', '龍ケ崎市'], ['筑西保健所管内', '筑西市'], ['中央保健所管内', '水戸市'], ['土浦保健所管内', '土浦市'], ['潮来保健所管内', '潮来市'], ['古河保健所管内', '古河市'], ['ひたちなか保健所管内', 'ひたちなか市']] ;

let prevdate = null;
function cb_date( row )
{
  let date = row[ 4 ];
  if ( date == null || date === '' )
    date = prevdate;
  else
    prevdate = date;
  return new Date( date );
}

function csv_yeardate( date )
{
  return agh.sprintf( '%04d%02d', date.getFullYear(), date.getMonth()+1 );
}
function csv_filename( date )
{
  return agh.sprintf( `${csv_yeardate( date )}%02d.csv`, date.getDate() );
}
function csv_cache_filename( filename, cache_dir )
{
  return cache_dir ? path.join( cache_dir, filename ) : filename;
}

async function get_csv(uri)
{
  const h = await axios_instance().head( uri, { validateStatus: false } ).catch( () => {} );
  if ( h?.status === 200 )
  {
    Log.info( `trying GET ${uri} ...` );
    const response = await axios_instance().get( uri );
    if ( response )
      Log.info( `status = ${response.status}` );
    return response?.data;
  }
  return null;
}

// キャッシュディレクトリに当該ファイルがあればCSVをそこからロードする
// なければHTTP GETする
async function load_csv( date, cache_dir )
{
  const filename = csv_filename( date );
  const cachedir = cache_dir; //path.join( cache_dir, csv_cache_yeardate( date ) );
  await mkdirp( cachedir );
  let cache = csv_cache_filename( filename, cachedir );
  const stat = await fs.lstat( cache ).catch( () => null );
  if ( stat?.isFile() )
  {
    Log.info( `loading ${cache} from cache ...` );
    return fs.readFile( cache );
  }
  // キャッシュ上のファイルに更新があってもロードされない
  cache = csv_cache_filename( filename, cachedir );
  const uri = config.IBARAKI_HTML.DATA_URI.replace( /covid19_ibaraki\//, `covid19_ibaraki/archive/` ).replace( /.csv$/, `_${csv_yeardate(date)}.csv` );
  const received = await get_csv(uri);
  if ( received )
    await fs.writeFile( cache, received );
  return received;
}

async function cb_load_csv(cache_dir)
{
  let date = new Date(2020, 3);
  let cur = new Date();
  cur = cur.getFullYear() * 100 + cur.getMonth();
  let csvs = [];
  while ( date.getFullYear() * 100 + date.getMonth() < cur )
  {
    csvs.push( await load_csv( date, cache_dir ) );
    date.setMonth( date.getMonth() + 1 );
  }
  csvs.push( await get_csv(config.IBARAKI_HTML.DATA_URI) );
  //return csvs.filter( v => v ).map( (v, i) => {
  const joined = csvs.filter( v => v ).map( (v, i) => {
    let rows = typeof v == "string" ? v : iconv.decode( v, "UTF8" );
    if ( i > 0 )
    {
      // 見出しを取り除く
      rows = rows.substring( rows.indexOf("\n") + 1 );
    }
    return rows;
  } ).join('');
  return { data: joined };
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/茨城県` );
    const pref_name = '茨城県';
    return BasePoi.process_csv( {
      pref_name,
      alter_citys: ALTER_CITY_NAMES,
      cb_load_csv: () => cb_load_csv(cache_dir),
      cb_date: row => cb_date( row ), // 前行に同じという意味だろうけど、日付を空欄にするのはやめてほしい
      csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 7,
      col_city: 6
    } );
  }
}

