import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
];
export default class PoiOkayama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '岡山県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.OKAYAMA_CSV.DATA_URI,
      csv_encoding: 'CP932',
      //csv_encoding: 'UTF8',
      row_begin: 1,
      min_columns: 6,
      cb_date: rows => {
        const dm = rows[ 3 ].match( /((\d+)年)?(\d+)月(\d+)日/ );
        if ( !dm )
          throw new Error( "no date in okayama" );
        let year = new Date().getFullYear();
        if ( dm[ 2 ] )
        {
          year = parseInt( dm[ 2 ] );
          if ( year < 2000 )
            year += 2018; // 令和
        }
        return new Date( `${year}-${dm[ 3 ]}-${dm[ 4 ]}` );
      },
      col_city: 5
    } );
  }
}
