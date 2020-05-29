import Query from "./query.mjs";

export default class Infector extends Query
{
  constructor( db )
  {
    super( db );
    this.table_name = 'infectors';
  }
  async get( options={} )
  {
    return super.get( { resultFilter: ( row ) => { return { ...row, date: new Date( row.timestamp ) } } } );
  }
}
