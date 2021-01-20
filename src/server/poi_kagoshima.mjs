import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from './logger.mjs';
const config = global.covid19map.config;

import {axios_instance} from "./util.mjs";
import {processPastYearData, savePastYearData} from "./processPastYearData.mjs";

async function parse_html( html, pref_name )
{
  // 前年以前のデータが有る場合は読み込む
  let { pastCsv, lastYear } = await processPastYearData( pref_name) ;  // await が無いと、途中で戻ってくる。

  // 過去分の HTML ページへのリンクが書かれているページで、過去分のページの Uri を得る
  const pastUris = [];
  let re = /[\r\n]+?\s+<h6><a href="((?:.+?)html)">[\s\S]+?鹿児島県内での発生状況/g;
  while( true ){
    const m = re.exec(html);
    if( !m ){
      break;
    }
    pastUris.push(m[1]);
  }
  pastUris.sort();

  // 鹿児島県の最初に指定された　HTML ページから、患者情報部分を取り出す
  const rootm = html.match( /鹿児島県内での発生状況[\s\S]+?<tbody>[\s\S]+?<\/tr>([\s\S]+?)<\/tbody>/ );
  if ( !rootm )
    throw new Error( "no table in kagoshima" );
  const rows = rootm[ 1 ];
  const csv = [];

  //それぞれのページをパースする 関数
  const today = new Date();
  const prevs = [
    { rowspan: 0, value: 0 },
//      { rowspan: 0, value: new Date() },
    { rowspan: 0, value: new Date() },
    { rowspan: 0, value: '' }
  ];
  function getPatient( rows){
    let trancateParseFlag = false;
    re = /[\s\S]*?<tr>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<td(.*?)>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g; // セルは最低3つある
    while ( true )
    {
      const m = re.exec( rows );
      if ( !m )
        break;
      let cur = 1;
      prevs.forEach( (p, i) => {
        if ( p.rowspan > 1 )
        {
          p.rowspan--;
        }
        else
        {
          let token = m[ cur++ ];
          const ms = token && token.match( /rowspan="(\d+)"/ );
          if ( ms )
            p.rowspan = parseInt( ms[ 1 ] );
          token = m[ cur++ ];

          let mc, val;
          switch ( i )
          {
          case 0:
            mc = token.match( /(\d+)/ );
            val = mc && parseInt( mc[ 1 ] );
            break;
          case 1:
            mc = token.match( /((\d+)年)?(\d+)月(\d+)日/ );
            if ( mc )
            {
              if( Number(p.value.getMonth() + 1) < Number(mc[3])){
                val = new Date( p.value.getFullYear()-1, mc[3]-1, mc[4]);
                if( val.getFullYear() == lastYear){
                  trancateParseFlag = true;
                  //return trancateParseFlag;   // 前年のデータはファイルから読んだので、パースを止める
                }
              }else{
                val = new Date( p.value.getFullYear(), mc[3]-1, mc[4]);
              }
              //const year = mc[ 2 ] ? parseInt( mc[ 2 ] ) : new Date().getFullYear();
              //val = new Date( `${(year > 2000) ? year : (year + 2018)}-${mc[ 3 ]}-${mc[ 4 ]}` );
            }
            break;
          case 2:
            val = token.replace( /&nbsp;|[\s]/g, '' );
            break;
          default:
            break;
          }
          prevs[ i ].value = val || prevs[ i ].value;
        }
      } );
    
      if( trancateParseFlag == true){
        break;
      }
      if ( !prevs[ 2 ].value.match( />.*?[ー-－─]|欠番/ ) )  // 取り消し線っぽい
        csv.push( [ prevs[ 1 ].value, prevs[ 2 ].value ] );
    }
    return trancateParseFlag;
  }

  if( getPatient( rows ) == true ){       // 最初のページのパース
    // 次のデータを読む必要はない。
  }else{
    // 過去分のページのパース
    for( let i=pastUris.length-1; i>=0; i--){
      let uri = pastUris[i];
      const host = config.KAGOSHIMA_HTML.DATA_URI.match( uri.startsWith( '/' ) ? /^(https?:\/\/.+?)\// : /^(https?:\/\/.+?\/)/ )[ 1 ];
      uri = `${host}${uri}`;
      const cr = await axios_instance(
        { responseType: 'arraybuffer', 
          headers:{
            Referer: config.MIYAZAKI_HTML.DATA_URI
          }
        } ).get( uri );
      const html = iconv.decode( cr.data, 'UTF8');  
      if( getPatient( html ) == true ){
        break;
      };
    }
  }

  //前の年のデータがあれば保存
  await savePastYearData( csv, pref_name );   // await が無いとデバッグしにくい
  //file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => csv.push(item));
  return csv;
}

export default class PoiKagoshima extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
        pref_name: '鹿児島県',
//        alter_citys: ALTER_CITY_NAMES,
        csv_uri: config.KAGOSHIMA_HTML.DATA_URI,
        cb_parse_csv: cr => parse_html( iconv.decode( cr.data, 'UTF8' ), '鹿児島県' ),
        row_begin: 0,
        min_columns: 2,
        col_date: 0,
        col_city: 1
    });
  }
}
