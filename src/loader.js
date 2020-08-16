export default function Loader( json )
{
  const src_places = new Map();
  const src_values = new Map();
  const src_subtotals = new Map();
  const data = (typeof json === 'string') ? JSON.parse( json ) : json;
  const bgn = new Date( data.begin_at );
  const fin = new Date( data.finish_at );
  let curspot = 1;
  for ( let spot of data.spots )
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
    src_places.set( curspot, { geopos: spot.geopos, name: spot.name, begin_at: new Date( spot.data[ 0 ].date ), finish_at: new Date( spot.data[ spot.data.length-1 ].date ) } );
    src_values.set( curspot, vs );
    src_subtotals.set( curspot, ts );
    curspot++;
  }
  return { begin_at: bgn, finish_at: fin, num_days: ((src_values.size === 0) ? 0 : src_values.entries().next().value[ 1 ].length), places: src_places, values: src_values, subtotals: src_subtotals };
}
