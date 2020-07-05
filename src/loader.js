export default function Loader( json )
{
  const src_places = new Map();
  const src_values = new Map();
  const data = JSON.parse( json );
  const bgn = new Date( data.begin_at );
  const fin = new Date( data.finish_at );
  let curspot = 1;
  for ( let spot of data.spots )
  {
    src_places.set( curspot, { geopos: spot.geopos, name: spot.name } );
    const vs = [];
    let curdata = 0;
    for ( let d = new Date( bgn ), e = fin.getTime();  d.getTime() < e;  d.setDate( d.getDate() + 1 ) )
    {
      let infectors = 0;
      if ( curdata < spot.data.length )
      {
        const spotdata = spot.data[ curdata ];
        if ( new Date( spotdata.date ).getTime() === d.getTime() )
        {
          infectors = spotdata.infectors;
          curdata++;
        }
      }
      vs.push( infectors );
    }
    src_values.set( curspot, vs );
    curspot++;
  }
  return { begin_at: bgn, finish_at: fin, places: src_places, values: src_values };
}
