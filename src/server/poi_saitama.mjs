import axios from "axios";
import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

async function load_csv()
{
  const resIndex = await axios.get( config.SAITAMA_CSV.INDEX_URI );
  const lastLinkIndex = resIndex.data.lastIndexOf( '時点の状況です。' );
  if ( lastLinkIndex < 0 )
    throw new Error( "bad html" );
  const m = resIndex.data.substring( lastLinkIndex ).match( /^[\s\S]*?<a href="(https:\/\/opendata[^"]+)"/ );
  if ( !m )
    throw new Error( "bad link" );
  return axios.create( { 'responseType': 'arraybuffer' } ).get( m[ 1 ] );
}
export default class PoiSaitama extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '埼玉県',
      cb_load_csv: () => load_csv(),
      csv_encoding: 'CP932',
      row_begin: 1,
      min_columns: 5,
      cb_date: row => {
        if ( row[ 4 ].trim() === '調査中' )
          return null;  // ついでに市区町村が調査中の場合も撥ねてしまう
        const dm = row[ 1 ].trim().match( /((\d+)\/)?(\d+)\/(\d+)/ );
        if ( !dm )
          return null;
        let year = Number( dm[ 2 ] || new Date().getFullYear() ); // このへん2021年になってみないとわからない
        if ( year < 100 )
          year += 2000;
        return new Date( year, parseInt( dm[ 3 ] ) - 1, parseInt( dm[ 4 ] ) );
      },
      col_city: 4
    } );
  }
}
