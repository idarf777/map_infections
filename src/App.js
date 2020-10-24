//import agh from 'agh.sprintf';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl, setRTLTextPlugin} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import Log from './logger.js';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import ChartPanel from "./chart-panel.js";
import {axios_instance, datetostring, loadGeoJson} from "./server/util.mjs";
import { example_data } from "./example_data.js";
import loader from "./loader.js";
import './App.css';
import ToolTip from "./tool_tip.js";
import {colorrange, merge_object} from "./server/util.mjs";
import makeConfig from "./server/config.mjs";
import {GeoJsonLayer} from "@deck.gl/layers";

const config = makeConfig();
window.covid19map = { config: config };

const PLAYBUTTON_TEXT = { start: 'START', stop: 'STOP' };
const DATA_API_STATUS = { unloaded: 'DATA UNLOAD', loading: 'LOADING DATA...', loaded: 'DATA LOADED', error: 'ERROR' };

export default class App extends React.Component
{
  constructor(props) {
    super(props);
    // I'm using this ref to access methods on the DeckGL class
    this.mapRef = React.createRef();
  }

  state = {
    viewState: {
      latitude: config.MAP_CENTER[ 1 ],
      longitude: config.MAP_CENTER[ 0 ],
      zoom: config.MAP_ZOOM,
      bearing: config.MAP_BEARING,
      pitch: config.MAP_PITCH
    },
    layer_histogram_count: 0,
    layers: [],
    pref_geojsons: [],
    pref_active: null,
    begin_date: new Date(),
    finish_date: new Date(),
    max_day: 1,
    current_day: 0,
    timer_id: null,
    start_button_text: PLAYBUTTON_TEXT.start,
    data_api_loaded: DATA_API_STATUS.unloaded,
    inf_a: [],  // 感染者数 (アニメーション用)
    inf: []     // 感染者数
  };

  _getElevationValue = ( d, opt ) => {
    const id = (typeof d === 'number') ? d : (d[ 0 ][ 0 ]);
    const zoom = this.state.viewState?.zoom || config.MAP_ZOOM;
    // zoom=7で1.0 11で0.1
    let c = Math.max( Math.min( zoom, 11 ), 7 );// 11->-1 7->1
    const coef = Math.pow( 10, (4 - (c - 7))/4.0 );
    return (this.state && (opt?.is_real ? this.state.inf[ id ] : coef*Math.min( this.state.inf_a[ id ], config.MAX_INFECTORS ) )) || 0;
  };
  _getColorValue = d => {
    let v = this._getElevationValue( d, { is_real: true }  );
    if ( v !== 0 )
    {
      v = Math.min( (v + config.MAX_INFECTORS*0.1) / config.MAX_INFECTORS, 1.0 ); // ちょっとオフセットをつけて放物線でとる
      v = 1.0 - (1.0 - v)**4;
      v *= config.MAX_INFECTORS_COLOR;
    }
    return Math.min( v, config.MAX_INFECTORS_COLOR );
  }
  _setHoveredDescription = ids => ids.map( id => `${this.state.srcdata.places.get( id ).name} : ${this._getElevationValue( id, { is_real: true } )}`  )
  _setHoveredObject = info => {
    const newstate = {};
    if ( !info.object || !this.state.srcdata?.places?.has( info.object.points[ 0 ][ 0 ] ) )
    {
      newstate.hoveredIds = null;
    }
    else
    {
      const ids = info.object.points.map( p => p[ 0 ] );
      merge_object( newstate, {
        hoveredIds: ids,
        hoveredValue: this._setHoveredDescription( ids ),
        pointerX: info.x + config.TOOLTIPS_CURSOR_OFFSET,
        pointerY: info.y
      } );
    }
    this.setState( newstate );
  }
  _onClick = info => {
    if ( !this.state.srcdata || (this.state.childClicked && (Date.now() - this.state.childClicked.getTime()) <= config.MAP_CLICK_PROPAGATION_TIME) )
      return; // DECK.GLは通常のmapbox-gl-jsイベントのように伝播しないので、クリック時刻で判断する
    let prefcd = 0;
    if ( this.state.hoveredIds )
    {
      const citycd = this.state.srcdata.places.get( this.state.hoveredIds[ 0 ] ).city_code;
      prefcd = (citycd > 1000) ? Math.floor(citycd / 1000) : citycd;
    }
    const summary = this.state.srcdata.map_summary.get( prefcd );
    if ( summary )
      this.redrawLayer( { selectedSummary: summary, pref_active: (prefcd > 0) && prefcd } );
  }
  _onClickOnChild = e => {
    this.setState( { childClicked: new Date() } );
  }
  _onClickOnGeojson = e => {
    const summary = this.state.srcdata.map_summary.get( e.layer.props.prefcd );
    const sel = summary && { selectedSummary: summary };
    this.redrawLayer( { ...(sel || {}), childClicked: new Date(), pref_active: e.layer.props.prefcd } )
  }

  createLayer()
  {
    return new InfectorsLayer({
      id: 'infectors_histogram',
      data: this.state?.data || [],
      coverage: config.MAP_COVERAGE,
      getColorValue: this._getColorValue,
      getElevationValue: this._getElevationValue,
      elevationScale: 1.0,
      elevationDomain: [0, config.MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
      elevationRange: [0, config.MAP_ELEVATION],  // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
      colorDomain: [0, config.MAX_INFECTORS_COLOR],  // 棒の色について、この幅で入力値を正規化する
      colorRange: colorrange( config.MAP_COLORRANGE ),
      extruded: true,
      getPosition: d => this.state.srcdata && this.state.srcdata.places.get( d[ 0 ] )?.geopos,
      opacity: 1.0,
      pickable: true,
      radius: config.MAP_POI_RADIUS,
      upperPercentile: config.MAP_UPPERPERCENTILE,
      onHover: this._setHoveredObject,
      updateTriggers: { getElevationValue: [ this.state.layer_histogram_count ], getColorValue: [ this.state.layer_histogram_count ] }  // これを指定しない場合はIDを都度振り替える
    });
  }

  animationStartDay()
  {
    if ( !this.state?.srcdata )
      return 0;
    const bgn = new Date();
    bgn.setDate( bgn.getDate() - config.ANIMATION_BEGIN_AT );
    return Math.max( 0, Math.floor( (bgn.getTime() - this.state.srcdata.begin_at.getTime())/(24*60*60*1000) ) );
  }
  loadData( data )
  {
    const srcdata = loader( data );
    const src_ids = Array.from( srcdata.places.keys() );
    this.setState(
      (state, prop) => { return { srcdata: srcdata, src_ids: src_ids, data: src_ids.map( k => [ k ] ) || [], data_api_loaded: DATA_API_STATUS.loading } },
      () => this.redrawLayer( {
        data_api_loaded: DATA_API_STATUS.loaded, begin_date: srcdata.begin_at, finish_date: srcdata.finish_at, max_day: srcdata.num_days, current_day: this.animationStartDay(),
        layers_histogram: [ this.createLayer() ]
      } )
    );
  }
  componentDidMount()
  {
    if ( config.STANDALONE )
    {
      this.loadData( example_data );
      return;
    }
    const host = config.SERVER_HOST || `${window.location.protocol}//${window.location.host}`;
    this.setState(
      (state, prop) => { return { data_api_loaded: DATA_API_STATUS.loading } },
      () => axios_instance().get( `${host}${config.SERVER_URI}`, { timeout: config.HTTP_GET_TIMEOUT } )
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
    this.setState(
      (state, props) => { return { ...(state_after || {}), layer_histogram_count: state.layer_histogram_count ^ 1 } },
      () => {
        const layers = this.state.pref_geojsons.map( geojson => new GeoJsonLayer( {
          ...geojson,
          getFillColor: d => {
            const color = config.MAP_PREFECTURE_ACTIVE_COLOR.slice();
            color.push( ( this.state.pref_active === geojson.prefcd ) ? 255 : 0 );
            return color;
          },
          updateTriggers: { getFillColor: [ this.state.pref_active ] },
          onClick: this._onClickOnGeojson
        } ) );
        layers.push( this.createLayer() );
        this.setState( { layers } )
      }
    );
  }

  getMap()
  {
    return this.mapRef?.getMap();
  }

  changeMapLocale( locale )
  {
    const map = this.getMap();
    if ( !map )
      return;
    this.setState(
      (state, props) => {
        //if ( state.mapbox_language )
        //  map.removeControl( state.mapbox_language );
        return { mapbox_language: new MapboxLanguage( locale ? { defaultLanguage: locale } : {} ) }
      },
      () => {
        map.addControl( this.state.mapbox_language );
        map.setLayoutProperty( 'country-label-lg', 'text-field', ['get', `name${ locale ? ('_'+locale) : ''}`] )
      }
    );
  }

  _onLoadMap = ev => {
    setRTLTextPlugin(
      // find out the latest version at https://www.npmjs.com/package/@mapbox/mapbox-gl-rtl-text
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
      null,
      // lazy: only load when the map first encounters Hebrew or Arabic text
      true
    );
    this.changeMapLocale();
    loadGeoJson().then( hashes => this.redrawLayer( { pref_geojsons: hashes } ) );
  };

  _onViewStateChange = ({viewState}) => {
    Log.debug( viewState );
    this.setState( {viewState} );
  };

  _onInterval = () => {
    //Log.debug( `timer awaken` );
    if ( !this.state.timer_id || !this.state.srcdata || this.state.current_day >= this.state.srcdata.num_days - 1 )
      return;
    const etm = Date.now() - this.state.timer_start_time; // [msec]
    const eday = Math.floor( etm / config.ANIMATION_SPEED );  // [day]
    const maxday = this.state.srcdata.num_days - 1;
    const is_exceeded = eday >= maxday;
    this.doAnimation( Math.min( eday, maxday ), is_exceeded ? 0 : ((etm - eday * config.ANIMATION_SPEED) / config.ANIMATION_SPEED) );
    if ( is_exceeded )
      this.stopAnimation();
  };

  onDebug01 = () =>
  {
    this.redrawLayer( { inf_1: this.state.inf_1 ? 100 : (this.state.inf_1 * 0.5) } );
  };
  onDebug02 = () =>
  {
    Log.debug( 'onDebug02' );
  };

  doAnimation( day, ratio )
  {
    if ( !this.state.srcdata )
      return;
    const nextstate = { inf: [].concat( this.state.inf ), inf_a: [].concat( this.state.inf_a ) };
    let isUpdateHovered = false;
    this.state.src_ids.forEach( id => {
      const vals = this.state.srcdata.values.get( id );
      let curval = vals[ day ];
      nextstate.inf[ id ] = curval;
      isUpdateHovered |= this.state.hoveredIds?.includes( id );
      if ( day < this.state.srcdata.num_days - 1 )
      {
        const d = vals[ day + 1 ] - curval;
        const r = ratio && (( d >= 0 ) ? (1.0 - (1.0 - ratio)**3) : (ratio**3));
        curval += d * (r || 0);
      }
      nextstate.inf_a[ id ] = curval;
    } );
    if ( isUpdateHovered )
      nextstate.hoveredValue = this._setHoveredDescription( this.state.hoveredIds );
    this.redrawLayer( { ...nextstate, current_day: day } );
  }
  startAnimation( cb )
  {
    if ( this.state.timer_id )
      return cb && cb();
    let tid = setInterval( this._onInterval, config.ANIMATION_TIME_RESOLUTION );
    Log.debug( `timer ${tid} set` );
    const beginday = this.state.current_day; // 表示開始日
    const dnow = new Date( Date.now() );
    dnow.setMilliseconds( dnow.getMilliseconds() - beginday*config.ANIMATION_SPEED );
    this.setState(
      (state, props) => { return { timer_id: tid, timer_start_time: dnow.getTime(), start_button_text: PLAYBUTTON_TEXT.stop, current_day: beginday, chart_day: beginday } },
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
  onClickStart = e => {
    e.stopPropagation();
    this.state.timer_id ? this.stopAnimation() : this.startAnimation();
    return false;
  }
  onClickReset = e => {
    e.stopPropagation();
    this.stopAnimation();
    this.doAnimation( this.animationStartDay() );
    return false;
  }
  onDateChanged = e => {
    e.stopPropagation();
    const day = e?.target?.value && parseInt( e.target.value );
    this.stopAnimation( () => day && this.setState(
      (state, props) => { return { chart_day: day }; },
      () => this.doAnimation( day ) )
    );
    return false;
  }

  render() {
    return (
      <DeckGL
        viewState={ this.state.viewState }
        onViewStateChange={this._onViewStateChange}
        controller={true}
        ContextProvider={MapContext.Provider}
        layers={this.state.layers}
        onClick={this._onClick}
      >
        <MapGL
          mapStyle={config.MAP_STYLE}
          mapboxApiAccessToken={this.props.accessToken}
          ref={map => { if ( map ) this.mapRef = map }}
          onLoad={this._onLoadMap}
        />
        <div className="navigation-control">
          <NavigationControl />
        </div>
        <ControlPanel containerComponent={this.props.containerComponent} apimsg={this.state.data_api_loaded} srcdata={this.state.srcdata} onClickRelay={this._onClickOnChild} />
        <ChartPanel containerComponent={this.props.containerComponent} summary={this.state.selectedSummary} start_day={datetostring( this.state.begin_date.getTime(), this.state.chart_day || this.state.current_day )} current_day={this.state.timer_id && datetostring( this.state.begin_date.getTime(), this.state.current_day )} onClickRelay={this._onClickOnChild} />
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
              <div id="swatches">
{/*
                <div className="blue">
                  <button id="blue_button" onClick={this.onDebug01} />
                </div>
                <div className="green">
                  <button id="green_button" onClick={this.onDebug02} />
                </div>
*/}
                <button className="btn-square" onClick={this.onClickStart}>{this.state.start_button_text}</button>
                <button className="btn-square" onClick={this.onClickReset}>RESET</button>
              </div>
            </fieldset>
          </div>
        </div>
        <ToolTip containerComponent={this.props.containerComponent} visible={this.state.hoveredIds != null} sx={this.state.pointerX} sy={this.state.pointerY} descriptions={this.state.hoveredValue}/>
      </DeckGL>
    );
  }
}

