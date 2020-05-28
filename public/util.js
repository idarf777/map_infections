function merge_object( dst, src )
{
  for( const key of Object.keys( src ) )
  {
    dst[ key ] = src[ key ];
  }
  return dst;
}
