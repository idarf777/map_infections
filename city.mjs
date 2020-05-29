import Query from "./query.mjs";

const GEOCOEF = 1.0 / (8*256*3600);

export default class City extends Query
{
  constructor( db )
  {
    super( db );
    this.table_name = 'cities';
  }
  async get( options={} )
  {
    return super.get( { resultFilter: ( row ) => { return { ...row, lat: row.lat*GEOCOEF, lon: row.lon*GEOCOEF } } } );
  }

}
