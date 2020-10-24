import {axios_instance, datetostring} from "./server/util.mjs";
//import Log from "./logger.js";

export default function Loader( json )
{
  const src_places = new Map();
  const src_values = new Map();
  const src_subtotals = new Map();
  const data = (typeof json === 'string') ? JSON.parse( json ) : json;
  const bgn = new Date( data.begin_at );
  const fin = new Date( data.finish_at );
  let curspot = 1;
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
    src_places.set( curspot, { city_code: spot.city_code, geopos: spot.geopos, name: spot.name, begin_at: new Date( spot.data[ 0 ].date ), finish_at: new Date( spot.data[ spot.data.length-1 ].date ) } );
    src_values.set( curspot, vs );
    src_subtotals.set( curspot, ts );
    curspot++;
  }
  // 全国版のsummaryをつくる
  const map_summary = new Map();
  const whole_summary = new Map();
  for ( const sm of data.summary )
  { // sm ... 都道府県のsummary
    const pref_summary = new Map();
    for ( const s of sm.subtotal )
    {
      pref_summary.set( s.date, s );  // 日付 - 感染者数のMap
      whole_summary.set( s.date, s.infectors + (whole_summary.get( s.date ) || 0) );
    }
    map_summary.set( sm.pref_code, { ...sm, map: pref_summary } );
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
  map_summary.forEach( ( v, pref_code ) => v.subtotal = smPref.get( pref_code ) );
  map_summary.set( 0, { pref_code: 0, name: '全国', begin_at: data.begin_at, finish_at: data.finish_at, subtotal: wsm } );
  return { begin_at: bgn, finish_at: fin, num_days: ((src_values.size === 0) ? 0 : src_values.entries().next().value[ 1 ].length), places: src_places, values: src_values, subtotals: src_subtotals, summary: data.summary, map_summary };
}

