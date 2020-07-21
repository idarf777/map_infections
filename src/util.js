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

export function sanitize_poi_name( name )
{
  return name && name.replace( /ヶ/g, 'ケ' ).replace( /[!-~]/g, c => String.fromCharCode( c.charCodeAt( 0 )+0xFEE0 ) );
}
