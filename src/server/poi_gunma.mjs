import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['渋川', '渋川市'], ['利根沼田保健所管内', '沼田市'], ['渋川保健所管内', '渋川市'], ['伊勢崎保健所管内', '伊勢崎市'], ['桐生保健所管内', '桐生市'], ['館林保健所管内', '館林市'],  ['富岡保健所管内', '富岡市'], ['吾妻保健所管内', '東吾妻町']];
function parse_date( row )
{
  const m = row[ 1 ].trim().match( /((\d+)[年/])?((\d+)[月/])((\d+)[日/])/ );
  if ( !m )
    return null;
  let year = new Date().getFullYear();
  if ( m[ 2 ] )
  {
    year = parseInt( m[ 2 ] );
    if ( year < 2000 )
      year += 2018; // 令和〇年を西暦にする
  }
  return new Date( `${year}/${parseInt( m[ 4 ] )}/${parseInt( m[ 6 ] )}` );
}

export default class PoiGunma extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '群馬県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.GUNMA_CSV.DATA_URI,
        csv_encoding: 'UTF8',
        cb_date: row => parse_date( row ),
        row_begin: 1,
        min_columns: 6,
        col_city: 3
    });
  }
}
