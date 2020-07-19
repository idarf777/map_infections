import agh from "agh.sprintf";
import path from 'path';
import { promises as fs } from "fs";
import axios from "axios";
import {config} from "../config.js";
import Log from "../logger.js";
import { parse_csv, datetostring } from "../util.js";
import mkdirp from "mkdirp";

const poi_tokyo = [
[35.6907986111111,139.756840277778,'東京都千代田区'],
[35.6673611111111,139.775243055556,'東京都中央区'],
[35.6547916666667,139.754756944444,'東京都港区'],
[35.6907986111111,139.706736111111,'東京都新宿区'],
[35.7046527777778,139.7559375,'東京都文京区'],
[35.7094097222222,139.783159722222,'東京都台東区'],
[35.7075,139.804722222222,'東京都墨田区'],
[35.6696180555556,139.820659722222,'東京都江東区'],
[35.6059027777778,139.733402777778,'東京都品川区'],
[35.6382638888889,139.701388888889,'東京都目黒区'],
[35.558125,139.719270833333,'東京都大田区'],
[35.6433333333333,139.656493055556,'東京都世田谷区'],
[35.6604513888889,139.700902777778,'東京都渋谷区'],
[35.7041666666667,139.667048611111,'東京都中野区'],
[35.6963194444444,139.639618055556,'東京都杉並区'],
[35.7228819444444,139.719895833333,'東京都豊島区'],
[35.7496527777778,139.736736111111,'東京都北区'],
[35.7328472222222,139.786597222222,'東京都荒川区'],
[35.7479166666667,139.712465277778,'東京都板橋区'],
[35.7323611111111,139.654861111111,'東京都練馬区'],
[35.7717013888889,139.8078125,'東京都足立区'],
[35.74,139.850590277778,'東京都葛飾区'],
[35.7034375,139.871666666667,'東京都江戸川区'],
[35.6632986111111,139.319201388889,'東京都八王子市'],
[35.7107291666667,139.411041666667,'東京都立川市'],
[35.7145138888889,139.569236111111,'東京都武蔵野市'],
[35.6802430555556,139.562743055556,'東京都三鷹市'],
[35.7847569444444,139.278993055556,'東京都青梅市'],
[35.6656944444444,139.480729166667,'東京都府中市'],
[35.7025,139.356840277778,'東京都昭島市'],
[35.6473958333333,139.544027777778,'東京都調布市'],
[35.5434027777778,139.441805555556,'東京都町田市'],
[35.69625,139.50625,'東京都小金井市'],
[35.7253472222222,139.480659722222,'東京都小平市'],
[35.6680208333333,139.398194444444,'東京都日野市'],
[35.7513888888889,139.471701388889,'東京都東村山市'],
[35.7071180555556,139.466388888889,'東京都国分寺市'],
[35.6806597222222,139.444583333333,'東京都国立市'],
[35.7352430555556,139.330138888889,'東京都福生市'],
[35.6316319444444,139.581944444444,'東京都狛江市'],
[35.7421527777778,139.429652777778,'東京都東大和市'],
[35.7825347222222,139.529652777778,'東京都清瀬市'],
[35.7547222222222,139.532951388889,'東京都東久留米市'],
[35.7516319444444,139.390625,'東京都武蔵村山市'],
[35.6337847222222,139.449513888889,'東京都多摩市'],
[35.6346875,139.5078125,'東京都稲城市'],
[35.7639583333333,139.314201388889,'東京都羽村市'],
[35.7256944444444,139.297291666667,'東京都あきる野市'],
[35.7223263888889,139.541458333333,'東京都西東京市'],
[35.7687847222222,139.357256944444,'東京都瑞穂町'],
[35.7389236111111,139.260625,'東京都日の出町'],
[35.8062847222222,139.099409722222,'東京都奥多摩町'],
[35.7236111111111,139.152048611111, '東京都檜原村'],
[34.7466666666667,139.358888888889,'東京都大島町'],
[34.5259027777778,139.2853125,'東京都利島村'],
[34.3737152777778,139.259930555556,'東京都新島村'],
[34.2020833333333,139.137708333333,'東京都神津島村'],
[33.8938541666667,139.599201388889,'東京都御蔵島村'],
[33.1090972222222,139.792256944444,'東京都八丈町'],
[32.4629166666667,139.766527777778,'東京都青ケ島村'],
[27.0903125,142.195034722222,'東京都小笠原村'],
[34.5703819444444,135.775972222222,'東京都三宅町'],
[34.5650694444444,133.238993055556,'東京都府中市'],
[35.683971,139.753571,'東京都(詳細不明)']
];
const cityname_tokyo = [
  ['千代田', '東京都千代田区'],
  ['中央', '東京都中央区'],
  ['港', '東京都港区'],
  ['新宿', '東京都新宿区'],
  ['文京', '東京都文京区'],
  ['台東', '東京都台東区'],
  ['墨田', '東京都墨田区'],
  ['江東', '東京都江東区'],
  ['品川', '東京都品川区'],
  ['目黒', '東京都目黒区'],
  ['大田', '東京都大田区'],
  ['世田谷', '東京都世田谷区'],
  ['渋谷', '東京都渋谷区'],
  ['中野', '東京都中野区'],
  ['杉並', '東京都杉並区'],
  ['豊島', '東京都豊島区'],
  ['北', '東京都北区'],
  ['荒川', '東京都荒川区'],
  ['板橋', '東京都板橋区'],
  ['練馬', '東京都練馬区'],
  ['足立', '東京都足立区'],
  ['葛飾', '東京都葛飾区'],
  ['江戸川', '東京都江戸川区'],
  ['八王子', '東京都八王子市'],
  ['立川', '東京都立川市'],
  ['武蔵野', '東京都武蔵野市'],
  ['三鷹', '東京都三鷹市'],
  ['青梅', '東京都青梅市'],
  ['府中', '東京都府中市'],
  ['昭島', '東京都昭島市'],
  ['調布', '東京都調布市'],
  ['町田', '東京都町田市'],
  ['小金井', '東京都小金井市'],
  ['小平', '東京都小平市'],
  ['日野', '東京都日野市'],
  ['東村山', '東京都東村山市'],
  ['国分寺', '東京都国分寺市'],
  ['国立', '東京都国立市'],
  ['福生', '東京都福生市'],
  ['狛江', '東京都狛江市'],
  ['東大和', '東京都東大和市'],
  ['清瀬', '東京都清瀬市'],
  ['東久留米', '東京都東久留米市'],
  ['武蔵村山', '東京都武蔵村山市'],
  ['多摩', '東京都多摩市'],
  ['稲城', '東京都稲城市'],
  ['羽村', '東京都羽村市'],
  ['あきる野', '東京都あきる野市'],
  ['西東京', '東京都西東京市'],
  ['瑞穂', '東京都瑞穂町'],
  ['日の出', '東京都日の出町'],
  ['檜原', '東京都檜原村'],
  ['奥多摩', '東京都奥多摩町'],
  ['大島', '東京都大島町'],
  ['利島', '東京都利島村'],
  ['新島', '東京都新島村'],
  ['神津島', '東京都神津島村'],
  ['三宅', '東京都三宅町'],
  ['御蔵島', '東京都御蔵島村'],
  ['八丈', '東京都八丈町'],
  ['青ケ島', '東京都青ケ島村'],
  ['小笠原', '東京都小笠原村']
];
const map_poi = new Map();
for ( const poi of poi_tokyo )
  map_poi.set( poi[ 2 ], [ poi[ 1 ], poi[ 0 ] ] );
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
export default async function load_tokyo_poi()
{
  const cache_dir = path.join( config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_CACHE_DIR}/tokyo` );
  await mkdirp( cache_dir );
  // TOKYO_CSV.DATA_BEGIN_AT以降の取得可能なCSVをすべて取得する
  Log.debug( 'getting tokyo CSV...' );
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
      const name = map_cityname.get( d[ 0 ] );
      if ( !name )
        continue;
      if ( !map_city_infectors.has( name ) )
        map_city_infectors.set( name, { geopos: map_poi.get( name ), name, data: [] } );
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
