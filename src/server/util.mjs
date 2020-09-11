import agh from 'agh.sprintf';
import csv from "csv";

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
  mapAlterChars.set( c[ 0 ], c[ 1 ] );  // 部首文字を通常漢字で置き換える
for ( let i=0x21; i<=0x7e; i++ )
  mapAlterChars.set( String.fromCharCode( i ), String.fromCharCode( i+0xfee0 ) ); // 半角記号英数字を全角にする

export function sanitize_poi_name( name )
{
  return name && name.replace( /[\s]/g, '' ).split( '' ).map( c => mapAlterChars.get( c ) || c ).join( '' );
}
