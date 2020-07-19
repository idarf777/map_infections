import dotenv from 'dotenv';
//import agh from 'agh.sprintf';
import * as React from 'react';
import axios from 'axios';
import MapGL, {_MapContext as MapContext, NavigationControl} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { config } from './config.js';
import Log from './logger.js';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import { datetostring } from "./util.js";
import { example_data } from "./example_data.js";
import loader from "./loader.js";
import './App.css';
import ToolTip from "./tool_tip";
import {to_bool, colorrange} from "./util";

dotenv.config();

let srcdata;// = loader( example_data );
let src_ids;// = Array.from( srcdata.places.keys() );
const PLAYBUTTON_TEXT = { start: 'START', stop: 'STOP' };
const DATA_API_STATUS = { unloaded: 'UNLOAD', loading: 'LOADING...', loaded: 'LOADED', error: 'ERROR' };

export default class App extends React.Component
{
  _getElevationValue = ( d, opt ) => {
    const id = d[ 0 ][ 0 ];
    return (this.state && (opt?.is_real ? this.state.inf[ id ] : Math.min( this.state.inf_a[ id ], config.MAX_INFECTORS ) )) || 0;
  };
  _getColorValue = d => {
    let v = this._getElevationValue( d );
    if ( v !== 0 )
    {
      v = Math.min( (v + config.MAX_INFECTORS*0.1) / config.MAX_INFECTORS, 1.0 ); // ちょっとオフセットをつけて放物線でとる
      v = 1.0 - (1.0 - v)**4;
      v *= config.MAX_INFECTORS;
    }
    return Math.min( v, config.MAX_INFECTORS );
  }
  createLayer = ( count ) => new InfectorsLayer({
    id: `3dgram${count}`,
    data: src_ids?.map( k => [ k ] ) || [],  // 配列の配列を指定する
    coverage: config.MAP_COVERAGE,
    getColorValue: this._getColorValue,
    getElevationValue: this._getElevationValue,
    elevationScale: 1.0,
    elevationDomain: [0, config.MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
    elevationRange: [0, config.MAP_ELEVATION],  // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
    colorDomain: [0, config.MAX_INFECTORS_COLOR],  // 棒の色について、この幅で入力値を正規化する
    colorRange: colorrange( config.MAP_COLORRANGE ),
    extruded: true,
    getPosition: d => srcdata && srcdata.places.get( d[ 0 ] )?.geopos,
    opacity: 1.0,
    pickable: true,
    radius: config.MAP_POI_RADIUS,
    upperPercentile: config.MAP_UPPERPERCENTILE,
    onHover: info => this.setState(
      (info.object && srcdata?.places?.has( info.object.points[ 0 ][ 0 ] ) && {
        hoveredId: info.object.points[ 0 ][ 0 ],
        hoveredName: srcdata.places.get( info.object.points[ 0 ][ 0 ] ).name,
        hoveredValue: this._getElevationValue( info.object.points, { is_real: true } ),
        pointerX: info.x,
        pointerY: info.y
      }) || { hoveredId: null }
    )
  });

  state = {
    viewState: {
      latitude: config.MAP_CENTER[ 1 ],
      longitude: config.MAP_CENTER[ 0 ],
      zoom: config.MAP_ZOOM,
      bearing: config.MAP_BEARING,
      pitch: config.MAP_PITCH
    },
    layer_count: 0,
    layer_histogram: this.createLayer( 0 ),
    begin_date: new Date(),//srcdata.begin_at,
    finish_date: new Date(),//srcdata.finish_at,
    max_day: 1,//srcdata.num_days,
    current_day: 0,
    timer_id: null,
    start_button_text: PLAYBUTTON_TEXT.start,
    data_api_loaded: DATA_API_STATUS.unloaded,
    inf_a: [],  // 感染者数 (アニメーション用)
    inf: []     // 感染者数
  };

  loadData( data )
  {
Log.debug( colorrange( config.MAP_COLORRANGE ) );
    srcdata = loader( data );
    src_ids = Array.from( srcdata.places.keys() );
    this.redrawLayer( { data_api_loaded: DATA_API_STATUS.loaded, begin_date: srcdata.begin_at, finish_date: srcdata.finish_at, max_day: srcdata.num_days } );
  }
  componentDidMount()
  {
    if ( config.STANDALONE )
    {
      this.loadData( example_data );
      return;
    }
    this.setState(
      (state, prop) => { return { data_api_loaded: DATA_API_STATUS.loading } },
      () => axios.get( `${config.SERVER_HOST}:${config.SERVER_PORT}${config.SERVER_URI}` )
              .then( ( response ) => {
                //Log.debug( response );
                this.loadData( response.data );
              } )
              .catch( ( ex ) => {
                Log.error( ex );
                this.setState( { data_api_loaded: DATA_API_STATUS.error } );
              } )
    );
  }

  redrawLayer( state_after )
  {
    // レイヤーのIDを変えて再設定する
    this.setState(
      (state, props) => { return { ...(state_after || {}), layer_count: state.layer_count ^ 1 } },
      () => this.setState( { layer_histogram: this.createLayer( this.state.layer_count ) } )
    );
  }

  _onViewStateChange = ({viewState}) => {
    this.setState( {viewState} );
  };

  _onInterval = () => {
    //Log.debug( `timer awaken` );
    if ( !this.state.timer_id || !srcdata || this.state.current_day >= srcdata.num_days - 1 )
      return;
    const etm = Date.now() - this.state.timer_start_time; // [msec]
    const eday = Math.min( Math.floor( etm / config.ANIMATION_SPEED ), srcdata.num_days - 1 );  // [day]
    const emod = (eday >= srcdata.num_days - 1) ? 0 : ((etm - eday * config.ANIMATION_SPEED) / config.ANIMATION_SPEED);
    this.doAnimation( eday, emod );
  };

  onDebug01 = () =>
  {
    this.redrawLayer( { inf_1: this.state.inf_1 ? 100 : (this.state.inf_1 * 0.5) } );
  };
  onDebug02 = () =>
  {
  };

  doAnimation( day, ratio )
  {
    if ( !srcdata )
      return;
    const nextstate = { inf: [].concat( this.state.inf ), inf_a: [].concat( this.state.inf_a ) };
    src_ids.forEach( id => {
      const vals = srcdata.values.get( id );
      let curval = vals[ day ];
      nextstate.inf[ id ] = curval;
      if ( this.state.hoveredId === id )
        nextstate.hoveredValue = curval;
      if ( day < srcdata.num_days - 1 )
      {
        let nextval = vals[ day + 1 ];
        curval += (nextval - curval) * (ratio || 0);
      }
      nextstate.inf_a[ id ] = curval;
    } );
    this.redrawLayer( { ...nextstate, current_day: day } );
  }
  startAnimation( cb )
  {
    if ( this.state.timer_id )
      return cb && cb();
    let tid = setInterval( this._onInterval, config.ANIMATION_TIME_RESOLUTION );
    Log.debug( `timer ${tid} set` );
    const beginday = 0; // 表示開始日
    const dnow = new Date( Date.now() );
    dnow.setDate( dnow.getDate() - beginday );
    this.setState(
      (state, props) => { return { timer_id: tid, timer_start_time: dnow.getTime(), start_button_text: PLAYBUTTON_TEXT.stop, current_day: 0 } },
      () => cb && cb()
    );
  }
  stopAnimation( cb )
  {
    if ( !this.state.timer_id )
      return cb && cb();
    clearInterval( this.state.timer_id );
    Log.debug( `timer ${this.state.timer_id} cleared` );
    this.setState(
      (state, props) => { return { timer_id: null, start_button_text: PLAYBUTTON_TEXT.start } },
      () => cb && cb()
    );
  }
  onClickStart = () => this.state.timer_id ? this.stopAnimation() : this.startAnimation();

  onDateChanged = ( ev ) => this.stopAnimation( () => ev?.target?.value && this.doAnimation( parseInt( ev.target.value ) ) );

  render() {
    return (
      <DeckGL
        viewState={ this.state.viewState }
        onViewStateChange={this._onViewStateChange}
        controller={true}
        ContextProvider={MapContext.Provider}
        layers={[ this.state.layer_histogram ]}
      >
        <MapGL
          mapStyle={config.MAP_STYLE}
          mapboxApiAccessToken={process.env.REACT_APP_MapboxAccessToken}
        />
        <div className="navigation-control">
          <NavigationControl />
        </div>
        <ControlPanel containerComponent={this.props.containerComponent} apimsg={this.state.data_api_loaded}/>
        <div className="map-overlay top">
          <div className="map-overlay-inner">
            <div className="date">
              <label id="current_date">{ datetostring( this.state.begin_date.getTime(), this.state.current_day ) }</label>
            </div>
            <input id="slider_date" type="range" min="0" max={this.state.max_day - 1} step="1" value={this.state.current_day} onChange={this.onDateChanged} />
            <div style={{float: "left"}}>{datetostring(this.state.begin_date.getTime())}</div>
            <div style={{float: "right"}}>{datetostring(this.state.finish_date.getTime())}</div>
            <div><br/></div>
          </div>
          <div className="map-overlay-inner">
            <div>person</div>
            <div id="legend" className="legend">
              <div className="bar"></div>
            </div>
            <div style={{float: "left"}}>0</div>
            <div style={{float: "right"}}>{config.MAX_INFECTORS}</div>
            <div><br/></div>
          </div>
          <div className="map-overlay-inner">
{/*
            <fieldset>
              <label>Select layer</label>
              <select id="layer" name="layer">
                <option value="water">Water</option>
                <option value="building">Buildings</option>
              </select>
            </fieldset>
*/}
            <fieldset>
{/*
              <label></label>
*/}
              <div id="swatches">
                <div className="blue">
                  <button id="blue_button" onClick={this.onDebug01} />
                </div>
                <div className="green">
                  <button id="green_button" onClick={this.onDebug02} />
                </div>
                <a href="/#" className="btn-square" onClick={this.onClickStart}>{this.state.start_button_text}</a>
              </div>
            </fieldset>
          </div>
        </div>
        <ToolTip containerComponent={this.props.containerComponent} visible={this.state.hoveredId != null} sx={this.state.pointerX} sy={this.state.pointerY} desc={this.state.hoveredName} value={this.state.hoveredValue}/>
      </DeckGL>
    );
  }
}

