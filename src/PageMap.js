//import agh from 'agh.sprintf';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl, setRTLTextPlugin} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import Log from './logger.js';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import ChartPanel from "./chart-panel.js";
import {
  axios_instance,
  datetostring,
  get_user_locale_prefix,
  load_geojson
} from "./server/util.mjs";
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

export default class PageMap extends React.Component
{
  constructor(props) {
    super(props);
    // I'm using this ref to access methods on the DeckGL class
    this.mapRef = React.createRef();
    this._onDebug01 = this.onDebug01.bind( this );
    this._onDebug02 = this.onDebug02.bind( this );
    this._onClickStart = this.onClickStart.bind( this );
    this._onClickReset = this.onClickReset.bind( this );
    this._onClickOnChild = this.onClickOnChild.bind( this );
    this._onClickMap = this.onClickMap.bind( this );
    this._onClickNull = this.onClickNull.bind( this );
    this._onLoadMap = this.onLoadMap.bind( this );
    this._onViewStateChange = this.onViewStateChange.bind( this );
    this._onInterval = this.onInterval.bind( this );
    this._onDateChanged = this.onDateChanged.bind( this );
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

  getElevationValue( d, opt )
  {
    const id = (typeof d === 'number') ? d : (d[ 0 ][ 0 ]);
    const zoom = this.state.viewState?.zoom || config.MAP_ZOOM;
    // zoom=7で1.0 11で0.1
    let c = Math.max( Math.min( zoom, 11 ), 7 );// 11->-1 7->1
    const coef = Math.pow( 10, (4 - (c - 7))/4.0 );
    return (this.state && (opt?.is_real ? this.state.inf[ id ] : coef*Math.min( this.state.inf_a[ id ], config.MAX_INFECTORS ) )) || 0;
  };
  getColorValue( d )
  {
    let v = this.getElevationValue( d, { is_real: true }  );
    if ( v !== 0 )
    {
      v = Math.min( (v + config.MAX_INFECTORS*0.1) / config.MAX_INFECTORS, 1.0 ); // ちょっとオフセットをつけて放物線でとる
      v = 1.0 - (1.0 - v)**4;
      v *= config.MAX_INFECTORS_COLOR;
    }
    return Math.min( v, config.MAX_INFECTORS_COLOR );
  }
  setHoveredDescription( ids )
  {
    return ids.map( id => `${this.state.srcdata.places[ id ].name} : ${this.getElevationValue( id, { is_real: true } )}`  );
  }
  setHoveredObject( info, e )
  {
    const newstate = {};
    if ( !info.object || !this.state.srcdata?.places[ info.object.points[ 0 ][ 0 ] ] )
    {
      newstate.hoveredIds = null;
    }
    else
    {
      const ids = info.object.points.map( p => p[ 0 ] );
      merge_object( newstate, {
        hoveredIds: ids,
        hoveredValue: this.setHoveredDescription( ids ),
        pointerX: info.x + config.TOOLTIPS_CURSOR_OFFSET,
        pointerY: info.y
      } );
    }
    this.setState( newstate );
  }
  is_click_invalid()
  {
    // DECK.GLは通常のmapbox-gl-jsイベントのように伝播しないので、クリック時刻で判断する
    return this.state.childClicked && (Date.now() - this.state.childClicked.getTime()) <= config.MAP_CLICK_PROPAGATION_TIME;
  }
  onClickMap( info )
  {
    if ( !this.state.srcdata || this.is_click_invalid() )
      return;
    let pref_code = 0;
    if ( this.state.hoveredIds )
    {
      const citycd = this.state.srcdata.places[ this.state.hoveredIds[ 0 ] ].city_code;
      pref_code = (citycd > 1000) ? Math.floor(citycd / 1000) : citycd;
    }
    const summary = this.state.srcdata.map_summary.get( pref_code );
    if ( summary )
      this.redrawLayer( { selectedSummary: summary, pref_active: (pref_code > 0) && pref_code } );
  }
  onClickOnChild( e )
  {
    this.setState( { childClicked: new Date() } );
  }
  onClickOnGeojson( e )
  {
    if ( !e || this.is_click_invalid() )
      return;
    const pref_code = e.layer.props.pref_code;
    const summary = this.state.srcdata.map_summary.get( pref_code );
    this.redrawLayer( { ...((summary && { selectedSummary: summary }) || {}), childClicked: new Date(), pref_active: pref_code } )
  }
  onClickNull( e )
  {
    e.stopPropagation();
    this.onClickOnChild( e );
  };

  createLayer()
  {
    return new InfectorsLayer({
      id: 'infectors_histogram',
      data: this.state?.src_ids || [],
      coverage: config.MAP_COVERAGE,
      getColorValue: d => this.getColorValue( d ),
      getElevationValue: d => this.getElevationValue( d ),
      elevationScale: 1.0,
      elevationDomain: [0, config.MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
      elevationRange: [0, config.MAP_ELEVATION],  // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
      colorDomain: [0, config.MAX_INFECTORS_COLOR],  // 棒の色について、この幅で入力値を正規化する
      colorRange: colorrange( config.MAP_COLORRANGE ),
      extruded: true,
      getPosition: d => this.state.srcdata && this.state.srcdata.places[ d[ 0 ] ]?.geopos,
      opacity: 1.0,
      pickable: true,
      radius: config.MAP_POI_RADIUS,
      upperPercentile: config.MAP_UPPERPERCENTILE,
      onHover: (info, e) => this.setHoveredObject( info, e ),
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
  async loadData( data )
  {
    const pref_geojsons = await load_geojson();
    const srcdata = loader( data, pref_geojsons );
    const src_ids = srcdata.places.map( (v, i) => v.geopos && [ i ] ).filter( v => v ); // 位置情報がないPOI(東京都調査中、東京都都外)はヒストグラムを表示しない
    this.setState(
      (state, prop) => { return { pref_geojsons, srcdata, src_ids } },
      () => this.redrawLayer( { begin_date: srcdata.begin_at, finish_date: srcdata.finish_at, max_day: srcdata.num_days, current_day: this.animationStartDay() } )
    );
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

  redrawLayer( state_after )
  {
    this.setState(
      (state, props) => { return { ...(state_after || {}), layer_histogram_count: state.layer_histogram_count ^ 1 } },
      () => {
        const layers = this.state.pref_geojsons.map( geojson => new GeoJsonLayer( {
          ...geojson,
          getFillColor: d => {
            const color = config.MAP_PREFECTURE_ACTIVE_COLOR.slice();
            if ( this.state.pref_active !== geojson.pref_code )
              color[ 3 ] = 0;
            return color;
          },
          updateTriggers: { getFillColor: [ this.state.pref_active ] },
          onClick: e => this.onClickOnGeojson( e )
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

  onLoadMap( e )
  {
    setRTLTextPlugin(
      // find out the latest version at https://www.npmjs.com/package/@mapbox/mapbox-gl-rtl-text
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
      null,
      // lazy: only load when the map first encounters Hebrew or Arabic text
      true
    );
    this.changeMapLocale();
  }

  onViewStateChange( { viewState } )
  {
    Log.debug( viewState );
    this.setState( {viewState} );
  }

  onInterval()
  {
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
  }

  onDebug01()
  {
    Log.debug( this.state );
  }
  onDebug02()
  {
    Log.debug( 'onDebug02' );
  }

  doAnimation( day, ratio )
  {
    if ( !this.state.srcdata )
      return;
    const nextstate = { inf: this.state.inf.slice(), inf_a: this.state.inf_a.slice() };
    let isUpdateHovered = false;
    this.state.src_ids.forEach( ida => {
      const idx = ida[ 0 ];
      const vals = this.state.srcdata.infectors[ idx ];
      let curval = vals[ day ];
      nextstate.inf[ idx ] = curval;
      isUpdateHovered |= this.state.hoveredIds?.includes( idx );
      if ( day < this.state.srcdata.num_days - 1 )
      {
        const d = vals[ day + 1 ] - curval;
        const r = ratio && (( d >= 0 ) ? (1.0 - (1.0 - ratio)**3) : (ratio**3));
        curval += d * (r || 0);
      }
      nextstate.inf_a[ idx ] = curval;
    } );
    if ( isUpdateHovered )
      nextstate.hoveredValue = this.setHoveredDescription( this.state.hoveredIds );
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
  onClickStart( e )
  {
    e.stopPropagation();
    this.state.timer_id ? this.stopAnimation() : this.startAnimation();
    this._onClickOnChild( e );
    return false;
  }
  onClickReset( e )
  {
    e.stopPropagation();
    this.stopAnimation();
    this.doAnimation( this.animationStartDay() );
    this._onClickOnChild( e );
    return false;
  }
  onDateChanged( e )
  {
    e.stopPropagation();
    const day = e?.target?.value && parseInt( e.target.value );
    this.stopAnimation( () => day && this.setState(
      (state, props) => { return { chart_day: day }; },
      () => this.doAnimation( day ) )
    );
    this._onClickOnChild( e );
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
        onClick={this._onClickMap}
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
        <ChartPanel containerComponent={this.props.containerComponent}
                    srcdata={this.state.srcdata}
                    summary={this.state.selectedSummary}
                    summary_whole={this.state.srcdata?.map_summary.get( 0 )}
                    start_date={datetostring( this.state.begin_date.getTime(), this.state.chart_day || this.state.current_day )}
                    current_date={datetostring( this.state.begin_date.getTime(), this.state.current_day )}
                    current_day={this.state.current_day}
                    in_animation={this.state.timer_id}
                    onClickRelay={this._onClickOnChild} />
        <div className="map-overlay top" onClick={this._onClickNull}>
          <div className="map-overlay-inner">
            <div className="date">
              <label id="current_date">{ datetostring( this.state.begin_date.getTime(), this.state.current_day ) }</label>
            </div>
            <input id="slider_date" type="range" min="0" max={this.state.max_day - 1} step="1" value={this.state.current_day} onChange={this._onDateChanged} />
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
            <fieldset>
              <div id="swatches">
                <button className="btn-square" onClick={this._onClickStart}>{this.state.start_button_text}</button>
                <button className="btn-square" onClick={this._onClickReset}>RESET</button>
              </div>
            </fieldset>
            { config.DEBUG && (
              <fieldset>
                <div id="swatches">
                  <button className="btn-square" onClick={this._onDebug01}>DEBUG1</button>
                  <button className="btn-square" onClick={this._onDebug02}>DEBUG2</button>
                </div>
              </fieldset>
            ) }
          </div>
        </div>
        <ToolTip containerComponent={this.props.containerComponent} visible={this.state.hoveredIds != null} sx={this.state.pointerX} sy={this.state.pointerY} descriptions={this.state.hoveredValue}/>
      </DeckGL>
    );
  }
}

