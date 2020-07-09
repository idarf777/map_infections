import dotenv from 'dotenv';
import agh from 'agh.sprintf';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { config } from './config.js';
import Log from './logger.js';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import { datetostring } from "./util.js";
import loader from "./loader.js";
import { example_data } from './example_data.js';
import './App.css';

dotenv.config();

const srcdata = loader( example_data );
const src_places = srcdata.places;
const src_values = srcdata.values;
const src_ids = Array.from( src_places.keys() );
const src_days = srcdata.num_days;
const PLAYBUTTON_TEXT = { start: 'START', stop: 'STOP' };
const INFECTOR_ID = id => `inf_${id}`;

export default class App extends React.Component
{
  _getElevationValue = d => (this.state && this.state[ INFECTOR_ID( d[ 0 ][ 0 ] ) ]) || src_values.get( d[ 0 ][ 0 ] )[ 0 ] || 0;

  createLayer = ( count ) => new InfectorsLayer({
    id: `3dgram${count}`,
    data: src_ids.map( k => [ k ] ),  // 配列の配列を指定する
    coverage: config.MAP_COVERAGE,
    getColorValue: this._getElevationValue,
    getElevationValue: this._getElevationValue,
    elevationScale: 1.0,
    elevationDomain: [0, config.MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
    elevationRange: [0, config.MAP_ELEVATION],  // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
    colorDomain: [0, config.MAX_INFECTORS],     // 棒の色について、この幅で入力値を正規化する
    colorRange: config.MAP_COLORRANGE,
    extruded: true,
    getPosition: d => src_places.get( d[ 0 ] ).geopos,
    opacity: 1.0,
    pickable: true,
    radius: config.MAP_POI_RADIUS,
    upperPercentile: config.MAP_UPPERPERCENTILE,
    onHover: info => this.setState({
      hoveredObject: info.object && src_places.get( info.object.points[ 0 ][ 0 ] ),
      pointerX: info.x,
      pointerY: info.y
    })
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
    begin_date: srcdata.begin_at,
    current_day: 0,
    max_day: src_days,
    timer_id: null,
    start_button_text: PLAYBUTTON_TEXT.start
  };

  renderTooltip()
  {
    const {hoveredObject, pointerX, pointerY} = this.state || {};
    return hoveredObject && (
      <div className="tooltip" style={{left: pointerX, top: pointerY}}>
        <div className="tooltip-desc">{ hoveredObject.name }</div>
      </div>
    );
  }

  redrawLayer()
  {
    // レイヤーのIDを変えて再設定する
    this.setState(
      (state, props) => { return { layer_count: state.layer_count ^ 1 } },
      () => this.setState( { layer_histogram: this.createLayer( this.state.layer_count ) } )
    );
  }

  _onViewStateChange = ({viewState}) => {
    this.setState( {viewState} );
  };

  _onInterval = () => {
    //Log.debug( `timer awaken` );
    if ( !this.state.timer_id || this.state.current_day >= src_days - 1 )
      return;
    const etm = Date.now() - this.state.timer_start_time; // [msec]
    const eday = Math.min( Math.floor( etm / config.ANIMATION_SPEED ), src_days - 1 );  // [day]
    const emod = (eday >= src_days - 1) ? 0 : ((etm - eday * config.ANIMATION_SPEED) / config.ANIMATION_SPEED);
    this.doAnimation( eday, emod );
  };

  onDebug01 = () =>
  {
    this.setState(
      (state, props) => { return { inf_1: state.inf_1 ? 100 : (state.inf_1 * 0.5) } },
      () => this.redrawLayer()
    );
  };
  onDebug02 = () =>
  {
  };

  doAnimation( day, ratio )
  {
    const nextstate = {};
    src_ids.forEach( id => {
      const vals = src_values.get( id );
      let curval = vals[ day ];
      if ( day < src_days - 1 )
      {
        let nextval = vals[ day + 1 ];
        curval += (nextval - curval) * (ratio || 0);
      }
      nextstate[ INFECTOR_ID( id ) ] = curval;
    } );
    this.setState(
      (state, props) => { return { ...nextstate, current_day: day } },
      () => this.redrawLayer()
    );
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

  onDateChanged = ( ev ) => this.stopAnimation( () => this.doAnimation( parseInt( ev.target.value ) ) );

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
        <ControlPanel containerComponent={this.props.containerComponent} />
        <div className="map-overlay top">
          <div className="map-overlay-inner">
            <h2>{ datetostring( this.state.begin_date.getTime(), this.state.current_day ) }</h2>
            <div className="date"><label id="current_date"><br/></label></div>
            <input id="slider_date" type="range" min="0" max={this.state.max_day - 1} step="1" value={this.state.current_day} onChange={this.onDateChanged} />
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
        { this.renderTooltip() }
      </DeckGL>
    );
  }
}

