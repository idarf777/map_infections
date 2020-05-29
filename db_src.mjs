import { app_config as config } from './config.mjs'
import sqlite3 from "sqlite3"

export default class DbSrc
{
  constructor( path )
  {
    this._database = new sqlite3.Database( path );
  }
  database()
  {
    return this._database;
  }
}
