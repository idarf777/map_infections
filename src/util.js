import agh from 'agh.sprintf';

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
