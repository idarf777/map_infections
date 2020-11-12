import {
  axios_instance,
  datetostring,
  get_user_locale_prefix,
  PREFECTURE_CODES
} from "./server/util.mjs";
import Log from "./logger.js";

function summaryName( pref_code, geojsons )
{
  const config = window.covid19map.config;
  const locale = get_user_locale_prefix();
  if ( pref_code === 0 )
    return config.MAP_SUMMARY_NATIONWIDE_NAME[ locale ] || config.MAP_SUMMARY_NATIONWIDE_NAME[ config.MAP_SUMMARY_LOCALE_FALLBACK ];
  const p = geojsons?.find( v => v.pref_code === pref_code )?.data.features[ 0 ].properties;
  return p && (p[ `name_${locale}` ] || p[ `name_${config.MAP_SUMMARY_LOCALE_FALLBACK}` ]);
}

export default function Loader( json, geojsons )
{
  const src_places = [];    // city_codeと都市名
  const src_infectors = []; // 日ごとの感染者数
  const src_subtotals = []; // 日ごとの累計感染者数
  const src_map_pref_places = new Map();  // pref_code - 配列(src_places/src_infectors/src_subtotalsのインデックス) のマップ
  const data = (typeof json === 'string') ? JSON.parse( json ) : json;
  const bgn = new Date( data.begin_at );
  const fin = new Date( data.finish_at );
  for ( const spot of data.spots )
  {
    if ( (spot.data?.length || 0) === 0 )
      continue;
    const vs = [];
    const ts = [];
    let curdata = 0;
    let subtotal = 0;
    for ( let d = new Date( bgn ), e = fin.getTime();  d.getTime() <= e;  d.setDate( d.getDate() + 1 ) )
    {
      let infectors = 0;
      if ( curdata < spot.data.length )
      {
        const spotdata = spot.data[ curdata ];
        if ( new Date( spotdata.date ).getTime() === d.getTime() )
        {
          subtotal = spotdata.subtotal;
          infectors = spotdata.infectors;
          curdata++;
        }
      }
      vs.push( infectors );
      ts.push( subtotal );
    }
    src_places.push( { city_code: spot.city_code, geopos: spot.geopos, name: spot.name, begin_at: new Date( spot.data[ 0 ].date ), finish_at: new Date( spot.data[ spot.data.length-1 ].date ) } );
    src_infectors.push( vs );
    src_subtotals.push( ts );

    const pref_code = Math.floor( spot.city_code/1000 );
    const pref_places = src_map_pref_places.get( pref_code ) || [];
    if ( pref_places.length === 0 )
      src_map_pref_places.set( pref_code, pref_places );
    pref_places.push( src_places.length - 1 );
  }

  // 全国版のsummaryをつくる
  const map_summary = new Map();
  const whole_summary = new Map();
  for ( const pref_code of Object.values( PREFECTURE_CODES ) )
  {
    const sm = data.summary.find( s => s.pref_code === pref_code ) || { pref_code, subtotal: [] }; // 都道府県のsummary
    const pref_summary = new Map();
    for ( const s of sm.subtotal )
    {
      pref_summary.set( s.date, s );  // 日付 - 感染者数のMap
      whole_summary.set( s.date, s.infectors + (whole_summary.get( s.date ) || 0) );
    }
    map_summary.set( sm.pref_code, { ...sm, name: summaryName( sm.pref_code, geojsons ), map: pref_summary } );
  }
  // 全国と都道府県のsummaryについて、空いている日付のところをinfectors=0として埋める
  const wsm = [];
  let wst = 0;
  const smPref = new Map();
  map_summary.forEach( ( v, pref_code ) => smPref.set( pref_code, [] ) );
  const prevPref = new Map();
  for ( const date = new Date( bgn ); date.getTime() <= fin.getTime(); date.setDate( date.getDate() + 1 ) )
  {
    const ds = datetostring( date );
    // 各都道府県のsummaryについて、日付がなければinfectors=0として埋める
    map_summary.forEach( (v, pref_code) => {
      let cur = v.map.get( ds );  // 日付に対応した感染者データがあるか？
      if ( !cur )
      {
        const prev = prevPref.get( pref_code ) || { subtotal: 0 };
        cur = { ...prev, date: ds, infectors: 0 };
      }
      prevPref.set( pref_code, cur );
      smPref.get( pref_code ).push( cur );
    } );
    // 全国のsummaryについて、日付がなければinfectors=0として埋める
    const cursm = whole_summary.get( ds ) || 0;
    wst += cursm;
    wsm.push( { date: ds, infectors: cursm, subtotal: wst } );
  }
  const japan_summary = new Map();
  for ( const s of wsm )
    japan_summary.set( s.date, s );
  map_summary.forEach( ( v, pref_code ) => v.subtotal = smPref.get( pref_code ) );
  map_summary.set( 0, { pref_code: 0, name: summaryName( 0, geojsons ), begin_at: data.begin_at, finish_at: data.finish_at, subtotal: wsm, map: japan_summary } );
  return { begin_at: bgn, finish_at: fin, num_days: src_infectors[ 0 ]?.length || 0, places: src_places, map_pref_places: src_map_pref_places, infectors: src_infectors, subtotals: src_subtotals, summary: data.summary, map_summary };
}

