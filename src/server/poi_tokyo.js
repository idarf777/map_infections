import agh from "agh.sprintf";
import path from 'path';
import { promises as fs } from "fs";
import axios from "axios";
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring, sanitize_poi_name } from "../util.js";
import mkdirp from "mkdirp";
import DbPoi from "./db_poi";

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
  ['小笠原', '小笠原村']
];
const map_cityname = new Map();
for ( const names of cityname_tokyo )
  map_cityname.set( names[ 0 ], names[ 1 ] );

async function load_csv( date, cache_dir )
{
  const prefix = agh.sprintf( '%04d%02d%02d', date.getFullYear(), date.getMonth()+1, date.getDate() );
  const suffix = '.csv';
  const mods = [ '-1', '_1', '06', '05', '04', '03', '02', '01', '' ];  // 修正版があるか調べてゆく
  for ( const m of mods )
  {
    try
    {
      const cache = path.join( cache_dir, `${prefix}${m}${suffix}` );
      if ( !(await fs.lstat( cache ))?.isFile() )
        continue;
      Log.debug( `loading ${cache} from cache ...` );
      return fs.readFile( cache );
    }
    catch
    {
    }
  }
  // キャッシュ上のファイルに更新があってもロードされない
  for ( const m of mods )
  {
    const filename = `${prefix}${m}${suffix}`;
    const cache = path.join( cache_dir, filename );
    const uri = `${config.TOKYO_CSV.DATA_URI}${filename}`;
    const h = await axios.head( uri, { validateStatus: false } ).catch( () => {} );
    if ( h?.status === 200 )
    {
      Log.debug( `trying GET ${uri} ...` );
      const response = await axios.get( uri );
      if ( response )
        Log.debug( `status = ${response.status}` );
      if ( response?.data )
        await fs.writeFile( cache, response.data );
      return response?.data;
    }
  }
  return null;
}
export default class PoiTokyo
{
  static async load()
  {
    const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/tokyo` );
    await mkdirp( cache_dir );
    // TOKYO_CSV.DATA_BEGIN_AT以降の取得可能なCSVをすべて取得する
    Log.debug( 'getting tokyo CSV...' );
    const map_poi = await DbPoi.getMap( '東京都' );
    const csvs = new Map();
    let lastdate = null;
    let firstcsv = null;
    for ( let date = new Date( config.TOKYO_CSV.DATA_BEGIN_AT ), lacks = 0;  lacks < config.TOKYO_CSV.DATA_LACK_COUNT;  date.setDate( date.getDate()+1 ) )
    {
      const csv = await load_csv( date, cache_dir ).catch( ex => Log.error( ex ) );
      if ( csv )
      {
        csvs.set( date.getTime(), csv );
        lastdate = new Date( date );
        firstcsv |= csv;
        lacks = 0;
        continue;
      }
      lacks++;
    }
    // 日付が欠けているところをその前日のCSVで補う
    for ( let date = new Date( config.TOKYO_CSV.DATA_BEGIN_AT ); lastdate && (date.getTime() <= lastdate.getTime());  date.setDate( date.getDate()+1 ) )
    {
      if ( csvs.has( date.getTime() ) )
        continue;
      const prevdate = new Date( date );
      prevdate.setDate( prevdate.getDate() - 1 );
      csvs.set( date.getTime(), csvs.get( prevdate.getTime() ) || firstcsv );
    }

    Log.debug( 'parsing tokyo CSV...' );
    const map_city_infectors = new Map();
    const timestamps = Array.from( csvs.keys() ).sort();
    for ( const tm of timestamps )
    {
      const date = new Date( tm );
      const rows = await parse_csv( csvs.get( tm ) );
      if ( !( rows && rows.length > 0 && rows[ 0 ].length >= 2 && rows[ 0 ][ 0 ].match( /^[^\d]+$/ ) && rows[ 0 ][ 1 ].match( /^\d+$/ ) ) )  // 先頭行が「文字,数字」であるか検証
      {
        Log.debug( `CSV at ${datetostring( date )} is invalid` );
        continue;
      }
      for ( const d of rows )
      {
        const name = sanitize_poi_name( map_cityname.get( sanitize_poi_name( d[ 0 ] ) ) );
        if ( !name )
          continue;
        if ( !map_city_infectors.has( name ) )
          map_city_infectors.set( name, { geopos: map_poi.get( name ).geopos(), name, data: [] } );
        const vals = map_city_infectors.get( name ).data;
        const subtotal = parseInt( d[ 1 ] );
        const prev_subtotal = (vals.length > 0) ? vals[ vals.length - 1 ].subtotal : subtotal;  // 初日の新規感染者はデータがない=0人
        vals.push( { date: datetostring( date ), infectors: Math.max( 0, subtotal - prev_subtotal ), subtotal: subtotal } );
      }
    }
    Log.debug( 'parsed tokyo CSV' );
    return {
      begin_at: datetostring( timestamps[ 0 ] ),
      finish_at: datetostring( timestamps[ timestamps.length - 1 ] ),
      spots: Array.from( map_city_infectors.values() )
    };
  }
}
