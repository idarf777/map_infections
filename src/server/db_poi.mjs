import sqlite3 from 'sqlite3';
import path from 'path';
import {sanitize_poi_name} from "./util.mjs";
const config = global.covid19map.config;

const TABLE_NAME = 'cities';
let database = null;

class DB
{
  static init()
  {
    database = new sqlite3.Database( path.join( config.ROOT_DIRECTORY, config.CITY_NAME_DATABASE ) );
  }
  static get()
  {
    if ( !database )
      DB.init();
    return database;
  }
}

export class Poi
{
  constructor( p )
  {
    this.city_cd = p.city_cd;
    this.pref = p.pref;
    this.name = sanitize_poi_name( p.name );
    this.lat = p.latitude;
    this.lon = p.longitude;
    this.name_en = p.name_en;
  }
  geopos()
  {
    return [ this.lon, this.lat ];
  }
}

const prefectures = new Map();

export default class DbPoi
{
  static async init()
  {
    const db = DB.get();
    return new Promise( (resolve, reject) => db.serialize( () => db.all(
      `SELECT city_cd,pref,name,latitude,longitude,name_en FROM ${TABLE_NAME} WHERE city_cd BETWEEN 1 AND 47`,
      (err, rows) => {
        if ( err )
          reject( err );
        else
        {
          rows.forEach( row => {
            prefectures.set( row.name, new Poi( row ) )
          } );
          resolve( rows );
        }
      }
    ) ) );
  }
  static async list( pref )
  {
    if ( prefectures.size === 0 )
      await DbPoi.init();
    const pd = prefectures.get( pref );
    if ( !pd )
      throw new Error( "bad prefecture" );
    const db = DB.get();
    return new Promise( (resolve, reject) => db.serialize( () => db.all(
      `SELECT city_cd,pref,name,latitude,longitude FROM ${TABLE_NAME} WHERE city_cd BETWEEN ${pd.city_cd*1000} AND ${(pd.city_cd + 1)*1000 - 1} ORDER BY city_cd`,
      (err, rows) => err ? reject( err ) : resolve( [ pd ].concat( rows.map( row => new Poi( row ) ) ) )
    ) ) );
  }
  static async getMap( pref )
  {
    const m = new Map();
    for ( const d of await DbPoi.list( pref ) )
    {
      m.set( sanitize_poi_name( d.name ), d );
      if ( d.name === pref )
        m.set( '', d );
    }
    return m;
  }
  static async get( city_cd )
  {
    const db = DB.get();
    return new Promise( (resolve, reject) => db.serialize( () => db.all(
      `SELECT city_cd,pref,name,latitude,longitude FROM ${TABLE_NAME} WHERE city_cd = ${city_cd}`,
      (err, rows) => err ? reject( err ) : resolve( new Poi( rows[ 0 ] ) )
    ) ) );
  }

}
