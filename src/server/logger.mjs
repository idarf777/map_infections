import agh from 'agh.sprintf';
import { LOGLEVEL } from './config.mjs';
const config = global.covid19map.config;

// console.logとconsole.errorをオーバーライドする
function datetostring( date )
{
  if ( !date )
    date = new Date();
  const ofs = date.getTimezoneOffset();
  return agh.sprintf(
    '%04d-%02d-%02d %02d:%02d:%02d.%03d %s%02d%02d',
    date.getFullYear(), date.getMonth()+1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds(),
    ((ofs < 0)?'+':'-'), Math.floor(Math.abs(ofs)/60), Math.abs(ofs)%60 );
}
const consolelog = console.log;
const consoleerror = console.error;
console.log = (...args) => consolelog(`[${datetostring()}]`, ...args);
console.error = (...args) => consoleerror(`[${datetostring()}]`, ...args);

const PREFIXES = Object.freeze( new Map ( [
  [LOGLEVEL.EVERY, 'V'],  // EVERY == VERBOSE
  [LOGLEVEL.DEBUG, 'D'],
  [LOGLEVEL.INFO, 'I'],
  [LOGLEVEL.ERROR, 'E'],
] ) );

export default class Log
{
  static verbose( ...value )
  {
    this.every( ...value );
  }
  static every( ...value )
  {
    this.put( LOGLEVEL.EVERY, ...value );
  }
  static debug( ...value )
  {
    this.put( LOGLEVEL.DEBUG, ...value );
  }
  static info( ...value )
  {
    this.put( LOGLEVEL.INFO, ...value );
  }
  static error( ...value )
  {
    this.put( LOGLEVEL.ERROR, ...value );
  }

  static put( level, ...value )
  {
    if ( config.LOGLEVEL > level )
      return;
    for ( const v of value )
    {
      if ( v instanceof Array )
      {
        this.put( level, ...v );
      }
      else if ( v instanceof Promise )
      {
        v.then( x => this.put( level, x ) ).catch( e => {
          this.outputstring( PREFIXES.get(LOGLEVEL.ERROR), e );
          consoleerror( `${PREFIXES.get(LOGLEVEL.ERROR)}[${datetostring()}]`, e )
        } );
      }
      else
      {
        this.outputstring( PREFIXES.get( level ), v );
      }
    }
  }

  static outputstring( prefix, ...str )
  {
    consolelog( `${prefix}[${datetostring()}]`, ...str );
  }

}
