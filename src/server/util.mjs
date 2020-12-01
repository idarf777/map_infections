import agh from 'agh.sprintf';
import csv from "csv";
import rax from 'retry-axios';
import axios from "axios";

export function round_8( v )
{
  return ( v == null  ||  isNaN( v ) ) ? '' : agh.sprintf( "%.8f", v );
}
export function round_4( v )
{
  return ( v == null  ||  isNaN( v ) ) ? '' : agh.sprintf( "%.4f", v );
}
export function to_num( s )
{
  return ( s == null  ||  s === '' ) ? null : Number( s )
}
export function to_bool( s )
{
  if ( !s || s === '' )
    return false;
  if ( (typeof s) !== "string" )
    return !!s;
  return /^\d+$/.exec( s ) ? (Number( s ) !== 0) : (s.toUpperCase() === 'TRUE');
}
export function uniq( ary, keys )
{
  return ary.filter( (v1,i) => ary.findIndex( v2 => keys.find( k => v1[ k ] !== v2[ k ] ) == null ) === i );
}
export function merge_object( dst, src )
{
  for( const key of Object.keys( src ) )
  {
    dst[ key ] = src[ key ];
  }
  return dst;
}
export function datetostring( ctm, elapsed_day )
{
  const date = new Date( ctm || Date.now() );
  date.setDate( date.getDate() + (elapsed_day || 0) );
  return agh.sprintf( '%04d-%02d-%02d',  date.getFullYear(), date.getMonth()+1, date.getDate() );
}
export async function parse_csv( data, options )
{
  return new Promise( ( resolve, reject ) => {
    csv.parse( data, { ...(options||{}), relax_column_count: true }, (err, parsed) => {
      err ? reject( err ) : resolve( parsed );
    } );
  } );
}

function intercolor( c1, c2, n )
{
  const m = 1.0 - n;
  return [ Math.floor(c1[ 0 ]*m + c2[ 0 ]*n), Math.floor(c1[ 1 ]*m + c2[ 1 ]*n), Math.floor(c1[ 2 ]*m + c2[ 2 ]*n) ];
}

export function colorrange( colors )
{
  const CN = 1000;
  if ( colors.length >= CN )
    return colors;
  const n_c = new Array( CN );
  for ( let c = 0; c < CN; c++ )
  {
    const f = c * colors.length / CN;
    const i = Math.floor( f );
    n_c[ c ] = intercolor( colors[ Math.min( i, colors.length-1 ) ], colors[ Math.min( i+1, colors.length-1 ) ], f - i );
  }
  n_c[ CN - 1 ] = colors[ colors.length - 1 ];
  return n_c;
}

// 役所の書類では、なぜか地名が部首に使われる字で書かれていることがある
const ALTER_CHARS = [
  ['⺅','人'],
  ['⺒','巳'],
  ['⺟','母'],
  ['⺠','民'],
  ['⺬','示'],
  ['⺭','礻'],
  ['⺼','月'],
  ['⺽','臼'],
  ['⻁','虎'],
  ['⻂','衤'],
  ['⻄','西'],
  ['⻆','角'],
  ['⻑','長'],
  ['⻘','青'],
  ['⻝','食'],
  ['⻣','骨'],
  ['⻤','鬼'],
  ['⻧','鹵'],
  ['⻨','麦'],
  ['⻩','黄'],
  ['⻫','斉'],
  ['⻭','歯'],
  ['⻯','竜'],
  ['⻱','亀'],
  ['⻲','亀'],
  ['⻳','亀'],
  ['⼄','乙'],
  ['⼆','二'],
  ['⼈','人'],
  ['⼊','入'],
  ['⼋','八'],
  ['⼑','刀'],
  ['⼒','カ'],
  ['⼔','匕'],
  ['⼗','十'],
  ['⼘','卜'],
  ['⼝','口'],
  ['⼞','口'],
  ['⼟','土'],
  ['⼠','士'],
  ['⼣','夕'],
  ['⼤','大'],
  ['⼥','女'],
  ['⼦','子'],
  ['⼨','寸'],
  ['⼩','小'],
  ['⼭','山'],
  ['⼯','工'],
  ['⼰','己'],
  ['⼱','巾'],
  ['⼲','干'],
  ['⼸','弓'],
  ['⼼','心'],
  ['⼾','戸'],
  ['⼿','手'],
  ['⽀','支'],
  ['⽂','文'],
  ['⽃','斗'],
  ['⽄','斤'],
  ['⽅','方'],
  ['⽇','日'],
  ['⽈','日'],
  ['⽉','月'],
  ['⽊','木'],
  ['⽋','欠'],
  ['⽌','止'],
  ['⽏','母'],
  ['⽐','比'],
  ['⽑','毛'],
  ['⽒','氏'],
  ['⽓','気'],
  ['⽔','水'],
  ['⽕','火'],
  ['⽖','爪'],
  ['⽗','父'],
  ['⽚','片'],
  ['⽛','牙'],
  ['⽜','牛'],
  ['⽝','犬'],
  ['⽞','玄'],
  ['⽟','玉'],
  ['⽠','瓜'],
  ['⽡','瓦'],
  ['⽢','甘'],
  ['⽣','生'],
  ['⽤','用'],
  ['⽥','田'],
  ['⽦','疋'],
  ['⽩','白'],
  ['⽪','皮'],
  ['⽫','皿'],
  ['⽬','目'],
  ['⽭','矛'],
  ['⽮','矢'],
  ['⽯','石'],
  ['⽰','示'],
  ['⽲','禾'],
  ['⽳','穴'],
  ['⽴','立'],
  ['⽵','竹'],
  ['⽶','米'],
  ['⽷','糸'],
  ['⽸','缶'],
  ['⽺','羊'],
  ['⽻','羽'],
  ['⽼','老'],
  ['⽽','而'],
  ['⽿','耳'],
  ['⾁','肉'],
  ['⾂','臣'],
  ['⾃','自'],
  ['⾄','至'],
  ['⾅','臼'],
  ['⾆','舌'],
  ['⾈','舟'],
  ['⾉','艮'],
  ['⾊','色'],
  ['⾍','虫'],
  ['⾎','血'],
  ['⾏','行'],
  ['⾐','衣'],
  ['⾒','見'],
  ['⾓','角'],
  ['⾔','言'],
  ['⾕','谷'],
  ['⾖','豆'],
  ['⾙','貝'],
  ['⾚','赤'],
  ['⾛','走'],
  ['⾜','足'],
  ['⾝','身'],
  ['⾞','車'],
  ['⾟','辛'],
  ['⾠','辰'],
  ['⾢','邑'],
  ['⾣','酉'],
  ['⾤','采'],
  ['⾥','里'],
  ['⾦','金'],
  ['⾧','長'],
  ['⾨','門'],
  ['⾩','阜'],
  ['⾬','雨'],
  ['⾭','青'],
  ['⾮','非'],
  ['⾯','面'],
  ['⾰','革'],
  ['⾳','音'],
  ['⾴','夏'],
  ['⾵','風'],
  ['⾶','飛'],
  ['⾷','食'],
  ['⾸','首'],
  ['⾹','香'],
  ['⾺','馬'],
  ['⾻','骨'],
  ['⾼','高'],
  ['⿁','鬼'],
  ['⿂','魚'],
  ['⿃','鳥'],
  ['⿄','鹵'],
  ['⿅','鹿'],
  ['⿇','麻'],
  ['⿈','黄'],
  ['⿉','黍'],
  ['⿊','黒'],
  ['⿍','鼎'],
  ['⿎','鼓'],
  ['⿏','鼠'],
  ['⿐','鼻'],
  ['⿑','齊'],
  ['⿒','歯'],
  ['⿓','龍'],
  ['ヶ','ケ'] // ついでに
];
const mapAlterChars = new Map();
for ( const c of ALTER_CHARS )
  mapAlterChars.set( c[ 0 ], c[ 1 ] );  // 部首文字を通常漢字で置き換えるa
for ( let i=0x21; i<=0x7e; i++ )
  mapAlterChars.set( String.fromCharCode( i ), String.fromCharCode( i+0xfee0 ) ); // 半角記号英数字を全角にする

export function sanitize_poi_name( name )
{
  return name && name.replace( /[\s]/g, '' ).split( '' ).map( c => mapAlterChars.get( c ) || c ).join( '' );
}

export function axios_instance( options )
{
  const opt = {
    ...options,
  };
  if ( opt.timeout == null )
    opt.timeout = 10000;
  const instance = axios.create( opt );
  const raxConfig = {
    instance,
    retry: 3,
    retryDelay: 5000,
    statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
  };
  const interceptorId = rax.attach( instance );
  return {
    get: uri => instance.get( uri, { raxConfig } ),
    post: uri => instance.get( uri, { raxConfig } ),
    head: uri => instance.head( uri, { raxConfig } ),
  };
}

export const PREFECTURE_CODES = {
  hokkaido:1,aomori:2,iwate:3,miyagi:4,akita:5,yamagata:6,fukushima:7,ibaraki:8,tochigi:9,gunma:10,saitama:11,chiba:12,tokyo:13,kanagawa:14,niigata:15,toyama:16,ishikawa:17,fukui:18,yamanashi:19,nagano:20,gifu:21,shizuoka:22,aichi:23,mie:24,shiga:25,kyoto:26,osaka:27,hyogo:28,nara:29,wakayama:30,tottori:31,shimane:32,okayama:33,hiroshima:34,yamaguchi:35,tokushima:36,kagawa:37,ehime:38,kochi:39,fukuoka:40,saga:41,nagasaki:42,kumamoto:43,oita:44,miyazaki:45,kagoshima:46,okinawa:47
};
export async function load_geojson( geojson )
{
  // 都道府県ごとに分割する
  return geojson.features.map( feature => {
    feature.properties.name = feature.properties.name.replace( /[Ōō]/g, 'o' ).toLowerCase();
    return {
      id: `layer-pref-${feature.properties.name}`,
      pref_code: PREFECTURE_CODES[ feature.properties.name ],
      data: { type: 'FeatureCollection', features: [ feature ] },
      pickable: true,
      filled: true,
      getFillColor: d => [200, 100, 240, 0], // とりあえず決めてるだけ
      //onClick: ev => {},
    };
  } ).sort( (a, b) => a.pref_code - b.pref_code );  // 都道府県コードの昇順
}

export function get_user_locale()
{
  return window.navigator.userLanguage || window.navigator.language;
}
export function get_user_locale_prefix()
{
  return get_user_locale().split( /[-_]/ )[ 0 ];
}

export function reverse_hash( h, is_key_numeric )
{
  return Object.keys( h ).reduce( (r, k) => {
    r[ h[ k ] ] = is_key_numeric ? parseInt( k ) : k;
    return r;
  }, {} );
}

export function count_days( from, to )
{
  let c = 0;
  for ( const d1=new Date( from ), d2=new Date( to ); d1.getTime() < d2.getTime(); d1.setDate( d1.getDate() + 1 ) )
    c++;
  return c + 1;
}

export function setStateAsync( component, newstate )
{
  return new Promise( resolve => component.setState( (state, prop) => newstate, () => resolve( true ) ) );
}

