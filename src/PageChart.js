//import agh from 'agh.sprintf';
import * as React from 'react';
import Log from './logger.js';
import {
  axios_instance,
  datetostring,
  get_user_locale_prefix,
  load_geojson, PREFECTURE_CODES, reverse_hash
} from "./server/util.mjs";
import { example_data } from "./example_data.js";
import loader from "./loader.js";
import './App.css';
import ToolTip from "./tool_tip.js";
import makeConfig from "./server/config.mjs";
import {
  LineChart,
  CartesianGrid, Label, ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis, Line, AreaChart
} from "recharts";

const config = makeConfig();
window.covid19map = { config: config };

const DATA_API_STATUS = { unloaded: 'DATA UNLOAD', loading: 'LOADING DATA...', loaded: 'DATA LOADED', error: 'ERROR' };

export default class PageChart extends React.Component
{
  state = {
    pref_geojsons: [],
    srcdata: null,
    src_ids: null,
    begin_date: new Date(),
    finish_date: new Date(),
    max_day: 1,
    current_day: 0,
    data_api_loaded: DATA_API_STATUS.unloaded,
    pref_checked: new Set(),
  };
  static PREFECTURE_NAMES = reverse_hash( PREFECTURE_CODES );

  constructor(props) {
    super(props);
    // I'm using this ref to access methods on the DeckGL class
  }

  async loadData( data )
  {
    const pref_geojsons = await load_geojson();
    const srcdata = loader( data, pref_geojsons );
    const src_ids = srcdata.places.map( (v, i) => v.geopos && [ i ] ).filter( v => v ); // 位置情報がないPOI(東京都調査中、東京都都外)はヒストグラムを表示しない
    this.setState( { pref_geojsons, srcdata, src_ids } );
  }
  componentDidMount()
  {
    const host = config.SERVER_HOST || `${window.location.protocol}//${window.location.host}`;
    this.setState(
      (state, prop) => { return { data_api_loaded: DATA_API_STATUS.loading } },
      () => (config.STANDALONE ? this.loadData( example_data ) : axios_instance().get( `${host}${config.SERVER_URI}` ).then( response => this.loadData( response.data ) ))
          .then( () => this.setState( { data_api_loaded: DATA_API_STATUS.loaded } ) )
          .catch( ( ex ) => {
            Log.error( ex );
            this.setState( { data_api_loaded: DATA_API_STATUS.error } );
          } )
    );
  }

  _onClickPrefName = ev => {
    ev.stopPropagation();
    const s = new Set( this.state.pref_checked );
    s.has( ev.target.name ) ? s.delete( ev.target.name ) : s.add( ev.target.name );
    this.setState( { pref_checked: s } );
  }

  _CustomTooltip = ({ active, payload, label }) => {
    const whole = payload.find( v => v.name === 'whole' );
    return (label && active && (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        { whole && (<p className="desc">{`${this.state.srcdata?.map_summary.get( 0 ).name} : ${whole.value}`}</p>) }
        { payload.map( v => (PREFECTURE_CODES[ v.name ] || null) && (<p className="desc">{`${this.state.srcdata?.map_summary.get( PREFECTURE_CODES[ v.name ] ).name} : ${v.value}`}</p>) ) }
      </div>
    )) || null;
  };

  render()
  {
    const mapData = new Map();
    const data = [];
    if ( this.state.srcdata?.map_summary )
    {
      const summary_whole = this.state.srcdata.map_summary.get( 0 );
      const summary = this.state.srcdata.map_summary;
      // 最新日付までデータを入れる
      for ( const cur = new Date( this.state.srcdata.begin_at ); ; cur.setDate( cur.getDate() + 1 ) )
      {
        const d = datetostring( cur );
        const whole = summary_whole.map.get( d )?.infectors; // 全国版は、最新日付までの全ての日付についてデータがあるはず
        if ( whole == null )
          break;
        const h = { name: d, whole };
        for ( const pref of this.state.pref_checked.keys() )
          h[ pref ] = summary.get( PREFECTURE_CODES[ pref ] ).map.get( d )?.infectors || 0;
        data.push( h );
        mapData.set( d, h );
      }
    }

    return (
      <div className="full-chart">
        { this.state.data_api_loaded !== DATA_API_STATUS.loaded && (<div className="text-left"><h3>{this.state.data_api_loaded}</h3></div>) }
        <div className="pane-root">
          <div className="pane-child-left">
            <div className="list-prefectures">
              <ul>
                {Object.keys( PREFECTURE_CODES ).map( pref => (
                  <li key={pref}>
                    <div className="inline-box-container">
                      <div className="checkboxArea inline-box">
                        <input type="checkbox" id={`check_${pref}`} name={pref} value={pref} checked={this.state.pref_checked.has( pref )} onChange={this._onClickPrefName} />
                        <label htmlFor={`check_${pref}`}><span></span></label>
                      </div>
                      <div className="inline-box-low">
                        <a href="#" name={pref} onClick={this._onClickPrefName}>{this.state.srcdata?.map_summary.get( PREFECTURE_CODES[ pref ] ).name || ''}</a>
                      </div>
                    </div>
                  </li>
                ) )}
              </ul>
            </div>
          </div>
          <div className="pane-child-right">
            <div className="chart-box">
              <ResponsiveContainer>
                <LineChart data={data} >
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004040" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#00a0a0" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<this._CustomTooltip />} />
                  <Line type="monotone" dataKey="whole" dot={false} />
                  { Array.from( this.state.pref_checked.keys() ).map( pref => (<Line type="monotone" dataKey={pref} dot={false} />) ) }
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

