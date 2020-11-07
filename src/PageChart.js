//import agh from 'agh.sprintf';
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import Log from './logger.js';
import {
  axios_instance, count_days,
  datetostring,
  get_user_locale_prefix,
  load_geojson, PREFECTURE_CODES, reverse_hash
} from "./server/util.mjs";
import { example_data } from "./example_data.js";
import loader from "./loader.js";
import './App.css';
import Slider from '@material-ui/core/Slider';
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
import {Link} from "react-router-dom";

const config = makeConfig();
window.covid19map = { config: config };

const DATA_API_STATUS = { unloaded: 'DATA UNLOAD', loading: 'LOADING DATA...', loaded: 'DATA LOADED', error: 'ERROR' };
const SHOW_HIDE_STYLES = [ "hidden", "show" ];
const WHOLE_JAPAN_KEY = 'whole';
const ALL_PREF_KEY = 'all';

class PageChart extends React.Component
{
  state = {
    pref_geojsons: [],
    srcdata: null,
    src_ids: null,
    begin_date: new Date(),
    finish_date: new Date(),
    max_day: 0,
    from_day: 0,
    to_day: 0,
    data_api_loaded: DATA_API_STATUS.unloaded,
    pref_checked: new Set(),
    pref_color: new Map(),
  };

  constructor(props)
  {
    super(props);
    // I'm using this ref to access methods on the DeckGL class
  }

  hsl_color( pref )
  {
    const H_PERIOD = 69;
    return `hsl(${(H_PERIOD*(PREFECTURE_CODES[ pref ] || 0)) % 360},80%,40%)`;
  }

  async loadData( data )
  {
    const pref_geojsons = await load_geojson();
    const srcdata = loader( data, pref_geojsons );
    const src_ids = srcdata.places.map( (v, i) => v.geopos && [ i ] ).filter( v => v ); // 位置情報がないPOI(東京都調査中、東京都都外)はヒストグラムを表示しない
    const max_day = count_days( srcdata.begin_at, srcdata.finish_at );
    this.setState( { pref_geojsons, srcdata, src_ids, begin_date: srcdata.begin_at, finish_date: srcdata.finish_at, max_day, from_day: 0, to_day: max_day-1 } );
  }
  componentDidMount()
  {
    const host = config.SERVER_HOST || `${window.location.protocol}//${window.location.host}`;
    this.setState(
      (state, prop) => { return { data_api_loaded: DATA_API_STATUS.loading, pref_checked: this.state.pref_checked.add( WHOLE_JAPAN_KEY ) } },
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
    const allpref = Object.keys( PREFECTURE_CODES )
    const is_all_on = () => s.size >= allpref.length + (s.has( WHOLE_JAPAN_KEY ) ? 1 : 0) + (s.has( ALL_PREF_KEY ) ? 1 : 0);
    const pref = ev.target.name;
    if ( pref === 'all' )
    {
      const all = is_all_on();
      [ ALL_PREF_KEY ].concat( allpref ).forEach( subpref => all ? s.delete( subpref ) : s.add( subpref ) );
    }
    else
    {
      s.has( pref ) ? s.delete( pref ) : s.add( pref );
      is_all_on() ? s.add( ALL_PREF_KEY ) : s.delete( ALL_PREF_KEY );
    }
    this.setState( { pref_checked: s } );
  }

  _CustomTooltip = ({ active, payload, label }) => {
    const whole = payload?.find( v => v.name === WHOLE_JAPAN_KEY );
    return (label && active && payload && (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        { whole && (<p className="desc">{`${this.state.srcdata?.map_summary.get( 0 ).name} : ${whole.value}`}</p>) }
        { payload.map( v => (PREFECTURE_CODES[ v.name ] || null) && (<p className="desc">{`${this.state.srcdata?.map_summary.get( PREFECTURE_CODES[ v.name ] ).name} : ${v.value}`}</p>) ) }
      </div>
    )) || null;
  };

  _onChangeSlider = (ev, num) => {
    this.setState( { from_day: num[ 0 ], to_day: num[ 1 ] } );
  };
  _sliderLabel = num => datetostring( this.state.begin_date, num );

  render()
  {
    const mapData = new Map();
    const data = [];
    if ( this.state.srcdata?.map_summary )
    {
      const summary_whole = this.state.srcdata.map_summary.get( 0 );
      const summary = this.state.srcdata.map_summary;
      // from_dayからto_dayまでデータを入れる
      const cur = new Date( this.state.srcdata.begin_at );
      const last = new Date( cur );
      cur.setDate( cur.getDate() + this.state.from_day );
      last.setDate( last.getDate() + this.state.to_day );
      for ( ; cur.getTime() <= last.getTime(); cur.setDate( cur.getDate() + 1 ) )
      {
        const d = datetostring( cur );
        if ( !summary_whole.map.has( d ) ) // 全国版は、最新日付までの全ての日付についてデータがあるはず
          break;
        const h = { name: d };
        for ( const pref of this.state.pref_checked.keys() )
          h[ pref ] = summary.get( PREFECTURE_CODES[ pref ] || 0 ).map.get( d )?.infectors || 0;
        data.push( h );
        mapData.set( d, h );
      }
    }

    return (
      <div className="full-panel">
        <div className="pane-root">
          <div className="pane-child-left">
            { (this.state.data_api_loaded !== DATA_API_STATUS.loaded) ?
                (<div className="text-left"><h3>{this.state.data_api_loaded}</h3></div>)
              : (<div className="date-selector">
                  <div className="date-begin">
                    <label id="current_date">{ datetostring( this.state.begin_date, this.state.from_day ) }</label>
                  </div>
                  <Slider
                    min={0}
                    max={this.state.max_day}
                    value={[this.state.from_day, this.state.to_day]}
                    onChange={this._onChangeSlider}
                    valueLabelDisplay="off"
                    aria-labelledby="range-slider"
                    getAriaValueText={this._sliderLabel}
                    valueLabelFormat={this._sliderLabel}
                  />
                  <div className="date-finish">
                    <label id="current_date">{ datetostring( this.state.begin_date, this.state.to_day ) }</label>
                  </div>
                  <div><br/></div>
                </div>)
            }
            <div className="list-prefectures">
              <ul>
                {[ WHOLE_JAPAN_KEY, ALL_PREF_KEY ].concat( Object.keys( PREFECTURE_CODES ) ).map( pref => (
                  <li key={pref}>
                    <div className="inline-box-container">
                      <div className="checkboxArea inline-box">
                        <input type="checkbox" id={`check_${pref}`} name={pref} value={pref} checked={this.state.pref_checked.has( pref )} onChange={this._onClickPrefName} />
                        <label htmlFor={`check_${pref}`}><span></span></label>
                      </div>
                      <div className="inline-box-low">
                        <a href="javascript:void(0);" name={pref} onClick={this._onClickPrefName}>{ ((pref !== 'all') && this.state.srcdata?.map_summary.get( PREFECTURE_CODES[ pref ] || 0 )?.name) || ''}</a>
                      </div>
                      {(pref !== ALL_PREF_KEY) && (<div className={SHOW_HIDE_STYLES[ this.state.pref_checked.has( pref ) ? 1 : 0 ]}>
                        <div className="inline-box-palette" style={{backgroundColor: this.hsl_color( pref )}}>
                        </div>
                      </div>)}
                    </div>
                  </li>
                ) )}
              </ul>
            </div>
          </div>
          <div className="pane-child-right">
            <div className="chart-box">
              <ResponsiveContainer>
                <LineChart data={data} margin={{top: 10, right: 50, left: 50, bottom: 50}} >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<this._CustomTooltip />} />
                  { Array.from( this.state.pref_checked.keys() ).map( pref => (<Line type="monotone" key={pref} dataKey={pref} dot={false} stroke={this.hsl_color( pref )} />) ) }
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-button-right">
              <div className="green">
                <Link to="/map"><button className="btn-square-small">VIEW MAP</button></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter( PageChart );
