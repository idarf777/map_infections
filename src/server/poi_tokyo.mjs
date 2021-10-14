import agh from "agh.sprintf";
import path from 'path';
import { promises as fs } from "fs";
import Log from "./logger.mjs";
import {parse_csv, datetostring, sanitize_poi_name, axios_instance} from "./util.mjs";
import mkdirp from "mkdirp";
import DbPoi from "./db_poi.mjs";
const config = global.covid19map.config;

const cityname_tokyo = [
  ['千代田', '千代田区'],
  ['中央', '中央区'],
  ['港', '港区'],
  ['新宿', '新宿区'],
  ['文京', '文京区'],
  ['台東', '台東区'],
  ['墨田', '墨田区'],
  ['江東', '江東区'],
  ['品川', '品川区'],
  ['目黒', '目黒区'],
  ['大田', '大田区'],
  ['世田谷', '世田谷区'],
  ['渋谷', '渋谷区'],
  ['中野', '中野区'],
  ['杉並', '杉並区'],
  ['豊島', '豊島区'],
  ['北', '北区'],
  ['荒川', '荒川区'],
  ['板橋', '板橋区'],
  ['練馬', '練馬区'],
  ['足立', '足立区'],
  ['葛飾', '葛飾区'],
  ['江戸川', '江戸川区'],
  ['八王子', '八王子市'],
  ['立川', '立川市'],
  ['武蔵野', '武蔵野市'],
  ['三鷹', '三鷹市'],
  ['青梅', '青梅市'],
  ['府中', '府中市'],
  ['昭島', '昭島市'],
  ['調布', '調布市'],
  ['町田', '町田市'],
  ['小金井', '小金井市'],
  ['小平', '小平市'],
  ['日野', '日野市'],
  ['東村山', '東村山市'],
  ['国分寺', '国分寺市'],
  ['国立', '国立市'],
  ['福生', '福生市'],
  ['狛江', '狛江市'],
  ['東大和', '東大和市'],
  ['清瀬', '清瀬市'],
  ['東久留米', '東久留米市'],
  ['武蔵村山', '武蔵村山市'],
  ['多摩', '多摩市'],
  ['稲城', '稲城市'],
  ['羽村', '羽村市'],
  ['あきる野', 'あきる野市'],
  ['西東京', '西東京市'],
  ['瑞穂', '瑞穂町'],
  ['日の出', '日の出町'],
  ['檜原', '檜原村'],
  ['奥多摩', '奥多摩町'],
  ['大島', '大島町'],
  ['利島', '利島村'],
  ['新島', '新島村'],
  ['神津島', '神津島村'],
  ['三宅', '三宅村'],
  ['御蔵島', '御蔵島村'],
  ['八丈', '八丈町'],
  ['青ケ島', '青ケ島村'],
  ['小笠原', '小笠原村'],
  ['都外', '都外'],
  ['都外※', '都外'],
  ['調査中', '調査中'],
  ['調査中※', '調査中'],
];
const map_cityname = new Map();
for ( const names of cityname_tokyo )
  map_cityname.set( names[ 0 ], names[ 1 ] );

const CSV_MODS = [ '', '-1', '_1', '06', '05', '04', '03', '02', '01', '2' ];
function csv_cache_yeardate( date )
{
  return agh.sprintf( '%04d-%02d', date.getFullYear(), date.getMonth()+1 );
}
function csv_yeardate( date )
{
  return agh.sprintf( '%04d%02d', date.getFullYear(), date.getMonth()+1 );
}
function csv_prefix( date )
{
  return agh.sprintf( `${csv_yeardate( date )}%02d`, date.getDate() );
}
function csv_filename( prefix, mod, cache_dir )
{
  const filename = `${prefix}${mod}.csv`;
  return cache_dir ? path.join( cache_dir, filename ) : filename;
}

// キャッシュディレクトリに当該ファイルがあればCSVをそこからロードする
// なければHTTP GETする
async function load_csv( date, cache_dir )
{
  const prefix = csv_prefix( date );
  const filedir = path.join( cache_dir, csv_cache_yeardate( date ) );
  await mkdirp( filedir );
  let cache = csv_filename( prefix, '', filedir );
  const stat = await fs.lstat( cache ).catch( () => null );
  if ( stat?.isFile() )
  {
    Log.info( `loading ${cache} from cache ...` );
    return fs.readFile( cache );
  }
  // キャッシュ上のファイルに更新があってもロードされない
  for ( const m of CSV_MODS )
  {
    const filename = csv_filename( prefix, m );
    cache = csv_filename( prefix, m, filedir );
    const uri = `${config.TOKYO_CSV.DATA_URI}${filename}`;
    const h = await axios_instance().head( uri, { validateStatus: false } ).catch( () => {} );
    if ( h?.status === 200 )
    {
      Log.info( `trying GET ${uri} ...` );
      const response = await axios_instance().get( uri );
      if ( response )
        Log.info( `status = ${response.status}` );
      if ( response?.data )
        await fs.writeFile( cache, response.data );
      return response?.data;
    }
  }
  return null;
}
async function remove_csv_cache( date, cache_dir )
{
  const prefix = csv_prefix( date );
  const filedir = path.join( cache_dir, csv_cache_yeardate( date ) );
  return Promise.all( CSV_MODS.map( m => {
    const cache = csv_filename( prefix, m, filedir );
    return fs.lstat( cache ).then( stat => stat.isFile() && fs.unlink( cache ) ).catch( () => {} );
  } ) );
}

async function replace_files( dir )
{
  const basefiles = await fs.readdir( dir );
  const bs = await Promise.all( basefiles.map( async p => {
    const s = await fs.lstat( path.join( dir, p ) ).catch( () => null );
    return s?.isFile() || false;
  } ) );
  const files = basefiles.filter( (v, i) => bs[ i ] ).sort();
  for ( const filepath of files )
  {
    const m = filepath.match( /^((\d{4})(\d{2})(\d{2})).*\.csv$/ )
    if ( m == null )
      continue;
    const year = Number( m[ 2 ] );
    const month = Number( m[ 3 ] );
    const date = Number( m[ 4 ] );
    if ( year < 2020 || year >= 2100 )
      continue; // 2020～2100年であればOK
    const d = new Date( year, month - 1, date );
    if ( year !== d.getFullYear() || month !== (d.getMonth() + 1) || date !== d.getDate() ) // 有効な日付か検証する
      continue;
    const srcfile = path.join( dir, filepath );
    const dstdir = path.join( dir, csv_cache_yeardate( d ) );
    const dstfile = path.join( dstdir, `${m[ 2 ]}${m[ 3 ]}${m[ 4 ]}.csv` );
    await mkdirp( dstdir );
    await fs.copyFile( srcfile, dstfile );
    await fs.unlink( srcfile );
  }
}

export default class PoiTokyo
{
  static async load()
  {
    const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/東京都` );
    await mkdirp( cache_dir );
    // TOKYO_CSV.DATA_BEGIN_AT以降の取得可能なCSVをすべて取得する
    Log.info( 'getting tokyo CSV...' );
    const map_poi = await DbPoi.getMap( '東京都' );
    const csvs = new Map();
    let lastdate = null;
    let firstcsv = null;
    // 連続でconfig.TOKYO_CSV.DATA_LACK_COUNT回、ファイルがなければ終了とする
    for ( let d = new Date( config.TOKYO_CSV.DATA_BEGIN_AT ), today = new Date( datetostring( Date.now() ) ), lacks = 0;
          lacks < config.TOKYO_CSV.DATA_LACK_COUNT  &&  today.getTime() >= d.getTime();
          d.setDate( d.getDate()+1 ) )
    {
      const csv = await load_csv( d, cache_dir ).catch( ex => Log.error( ex ) );
      const date = datetostring( d );
      if ( !csv )
      {
        Log.info( `${date} CSV lacks` );
        lacks++;
        continue;
      }
      csvs.set( date, csv );
      lastdate = new Date( d );
      firstcsv |= csv;
      lacks = 0;
    }
    // 日付が欠けているところをその前日のCSVで補う
    for ( let d = new Date( config.TOKYO_CSV.DATA_BEGIN_AT ); lastdate && (d.getTime() <= lastdate.getTime());  d.setDate( d.getDate()+1 ) )
    {
      const date = datetostring( d );
      if ( csvs.has( date ) )
        continue;
      const prevdate = new Date( d );
      prevdate.setDate( prevdate.getDate() - 1 );
      csvs.set( date, csvs.get( prevdate.getTime() ) || firstcsv );
    }
    await replace_files( cache_dir );

    Log.info( 'parsing tokyo CSV...' );
    const map_city_infectors = new Map();
    const csvdates = Array.from( csvs.keys() ).sort();
    for ( const date of csvdates )
    {
      const rows = await parse_csv( csvs.get( date ) ).catch( ex => {} );
      if ( !( rows && rows.length > 0 && rows[ 0 ].length >= 2 && rows[ 0 ][ 0 ].match( /^[^\d]+$/ ) && rows[ 0 ][ 1 ].match( /^\(?\d+\)?$/ ) ) )  // 先頭行が「文字,数字」であるか検証
      {
        Log.error( `CSV at ${date} is invalid` );
        await remove_csv_cache( date, cache_dir ).catch( ex => {} );
        continue;
      }
      for ( const d of rows )
      {
        const name = sanitize_poi_name( map_cityname.get( sanitize_poi_name( d[ 0 ] ) ) );
        if ( !name )
          continue;
        if ( !map_city_infectors.has( name ) )
        {
          const poi = map_poi.get( name );
          map_city_infectors.set( name, { city_code: poi?.city_cd || 13000, geopos: poi?.geopos(), name: `東京都${name.replace( /^(都外|調査中)$/, "(生活地:$1)" )}`, data: [] } );
        }
        const vals = map_city_infectors.get( name ).data;
        const m = d[ 1 ].match( /(\d+)/ );
        const subtotal = parseInt( (m && m[ 1 ]) || '0' );
        const prev_subtotal = (vals.length > 0) ? vals[ vals.length - 1 ].subtotal : subtotal;  // 初日の新規感染者はデータがない=0人
        vals.push( {
          date: datetostring( date ),
          infectors: subtotal - prev_subtotal, //Math.max( (name === '調査中') ? (-Number.MAX_VALUE) : 0, subtotal - prev_subtotal ),
          subtotal: subtotal
        } );
      }
    }
    for ( const spot of map_city_infectors.values() )
      spot.data = spot.data.filter( d => d.infectors !== 0 || (d === spot.data[ 0 ] && d.subtotal > 0) ); // 最初の日はinfectors==0でもsubtotal>0かもしれない

    Log.info( 'parsed tokyo CSV' );
    return {
      pref_code: 13,
      name: '東京都',
      begin_at: csvdates[ 0 ],
      finish_at: csvdates[ csvdates.length - 1 ],
      spots: Array.from( map_city_infectors.values() )
    };
  }
}
