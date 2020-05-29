export default class Query
{
  constructor( db )
  {
    this.db = db;
    this.where = null;
    this.order = null;
    this.limit = null;
    this.selecteds = '*';
    this.extradata = null;
    this.table_name = 'INVALID';
  }
  set_condition( cond )
  {
    this.where = cond;
    return this;
  }
  set_order( order )
  {
    this.order = order;
    return this;
  }
  set_limit( limit )
  {
    this.limit = limit;
    return this;
  }
  set_select( selecteds )
  {
    this.selecteds = selecteds;
    return this;
  }
  set_extra( data )
  {
    this.extradata = data;
    return this;
  }
  get_extra()
  {
    return this.extradata;
  }

  async count()
  {
    return new Promise( ( resolve, reject ) => {
      this.db.database().get( `SELECT COUNT(*) FROM ${this.table_name}`, ( err, row ) => {
        return err ? reject( err ) : resolve( row[ 'count(*)' ] );
      } );
    } );
  }

  async get( options={} )
  {
    return new Promise( ( resolve, reject ) => {
      this.db.database().serialize( () => {
        this.db.database().all( `SELECT ${this.selecteds} FROM ${this.table_name}${this.where ? ` WHERE ${this.where} `:''}${this.order ? ` ORDER BY ${this.order}`:''}${this.limit ? ` LIMIT ${this.limit}`:''}`,
          ( err, rows ) => {
            if ( err )
              return reject( err );
            const result = new Array( rows.length );
            for ( let i=0; i<rows.length; i++ )
            {
              const row = rows[ i ];
              result[ i ] = options.resultFilter ? options.resultFilter( row ) : { ...row };
            }
            return resolve( { instance: this, result: result } );
          } );
      } );
    } );
  }

}
