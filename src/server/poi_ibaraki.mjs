import BasePoi from "./base_poi.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [['県南地域', 'つくば市'], ['竜ケ崎保健所管内', '龍ケ崎市'], ['筑西保健所管内', '筑西市'], ['中央保健所管内', '水戸市'], ['土浦保健所管内', '土浦市'], ['潮来保健所管内', '潮来市'], ['古河保健所管内', '古河市'], ['ひたちなか保健所管内', 'ひたちなか市']] ;

let prevdate = null;
function cb_date( row )
{
  let date = row[ 5 ];
  if ( date == null || date === '' )
    date = prevdate;
  else
    prevdate = date;
  return new Date( date );
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    const pref_name = '茨城県';
    return BasePoi.process_csv( {
      pref_name,
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.IBARAKI_HTML.DATA_URI,
      cb_date: row => cb_date( row ), // 前行に同じという意味だろうけど、日付を空欄にするのはやめてほしい
      row_begin: 1,
      min_columns: 7,
      col_city: 6
    } );
  }
}

