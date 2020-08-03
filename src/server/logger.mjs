import {config, loglevel} from './config.mjs'
import agh from 'agh.sprintf';

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
  [loglevel.EVERY, 'V'],  // EVERY == VERBOSE
  [loglevel.DEBUG, 'D'],
  [loglevel.INFO, 'I'],
  [loglevel.ERROR, 'E']
] ) );

export default class Log
{
  static verbose( ...value )
  {
    this.every( ...value );
  }
  static every( ...value )
  {
    this.put( loglevel.EVERY, ...value );
  }
  static debug( ...value )
  {
    this.put( loglevel.DEBUG, ...value );
  }
  static info( ...value )
  {
    this.put( loglevel.INFO, ...value );
  }
  static error( ...value )
  {
    this.put( loglevel.ERROR, ...value );
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
          this.outputstring( PREFIXES.get(loglevel.ERROR), e );
          consoleerror( `${PREFIXES.get(loglevel.ERROR)}[${datetostring()}]`, e )
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
