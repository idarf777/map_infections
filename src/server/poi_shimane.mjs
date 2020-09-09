import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import axios from "axios";
import encoding from 'encoding-japanese';
import Log from './logger.mjs';
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['島根県松江市', '松江市'],
  ['島根県出雲市', '出雲市'],
  ['島根県雲南市', '雲南市'],
  ['島根県益田市', '益田市'],
];
async function parse_html( html )
{
  const re_for_html = new RegExp( [
    '<script src=\\"\\/_nuxt\\/(.+?js)\\"',
  ].join(''), 'g');
  
//  const re_for_js = /{(.+?確定日.+?居住地.+?)}/;
//  const re_for_js =/{\"確定日\":\"(\d{4})-(\d{2})-(\d{2}).+?\",\"居住地\":\"(.+?)\",/g;
//const re_for_js =/\"居住地\":\"(.+?)\".+?\"date\":\"(\d{4])-(\d{2})-(\d{2})\"},/g;
//const re_for_js =/\"居住地\":\"(.+?)\"/g;
//  const re_for_js =/\"居住地\":\"(.+?)\".+?\"date\":\"/g;
//const re_for_js =/\"居住地\":\"(.+?)\".+?\"date\":\"(\d+)-/g;
  const re_for_js =/\"居住地\":\"(.+?)\".+?\"date\":\"(\d+)-(\d+)-(\d+)\"/g;

  const csv = [];
  while(true){
    // 感染者データが含まれている jp src を探す。
    const m = re_for_html.exec(html);
    if( m != null){
      const js_url = 'https://shimane-covid19.com/_nuxt/' + m[1];
      //console.log(js_url);

    /* デバッグ用　参考のため残しておく
      await axios({
        method       : 'GET',
        url          : js_url,
        responseType : 'arrayBuffer'
      }).then(response => {
        console.log(response.status)
      }).catch( function (response){
        console.log(response);
      });
      */
      const t_js = await (axios.create({ 'responseType': 'arraybuffer' } ).get( js_url ));
      const detected = encoding.detect(t_js.data);
      const tJs = iconv.decode( t_js.data, detected ) 

      var findThatJs = false;
      var no = 0;
      while(true){
        const mm =re_for_js.exec( tJs );
        if( mm == null){
          if( findThatJs == false){
            break;
          }else{
            return csv;
          }
        }else{
          findThatJs = true;
        }
        const year = mm[ 2 ];
        const mon = mm[ 3 ];
        const day = mm[ 4 ];
        const city = mm[ 1 ];
        no++;
        console.log(no + ":" + year + " " + mon + " " + day + " " + city );
      
        csv.push( [ new Date( year, mon - 1, day ), city ] );
      }
    }else{
      Log.error( "???? error : cant find patients data on js src.");
      return;
    }
  }
}


export default class PoiShimane extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '島根県',
        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.SHIMANE_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ) ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
