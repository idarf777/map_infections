import dotenv from 'dotenv';
import agh from 'agh.sprintf';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { config } from './config.js';
import Log from './logger.js';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import loader from "./loader.js";
import { example_data } from './example_data.js';
import './App.css';

dotenv.config();

const srcdata = loader( example_data );
const src_places = srcdata.places;
const src_values = srcdata.values;

export default class App extends React.Component
{
  createLayer = ( count ) => new InfectorsLayer({
    id: `3dgram${count}`,
    data: Array.from( src_places.keys() ).map( k => [ k ] ),  // 配列の配列を指定する
    coverage: config.MAP_COVERAGE,
    getColorValue: this.getColorValue,
    getElevationValue: this.getElevationValue,
    elevationScale: 1.0,
    elevationDomain: [0, config.MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
    elevationRange: [0, config.MAP_ELEVATION],  // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
    colorDomain: [0, config.MAX_INFECTORS],     // 棒の色について、この幅で入力値を正規化する
    colorRange: config.MAP_COLORRANGE,
    extruded: true,
    getPosition: this.getPositionValue,
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
    current_date: srcdata.begin_at,
    current_day: 0
  };

  getPositionValue( d )
  {
    return src_places.get( d[ 0 ] ).geopos;
  }
  getColorValue( d )
  {
    const { current_day } = (this && this.state) || { current_day: 0 };
    return src_values.get( d[ 0 ][ 0 ] )[ current_day ];
  }
  getElevationValue( d )
  {
    const { current_day } = (this && this.state) || { current_day: 0 };
    return src_values.get( d[ 0 ][ 0 ] )[ current_day ];
  }

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
      (state, props) => { return { layer_count: this.state.layer_count ^ 1 } },
      () => this.setState( { layer_histogram: this.createLayer( this.state.layer_count ) } )
    );
  }

  _onViewStateChange = ({viewState}) => {
    this.setState( {viewState} );
  };

  onDebug01 = () =>
  {
    src_values.get( 1 )[ this.state.current_day ] *= 0.5;
    this.redrawLayer();
  }
  onDebug02 = () =>
  {
  }
  onClickStart = () =>
  {
    Log.debug("START");




    Log.debug("START COMPLETE");
  }

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
            <h2>XXX</h2>
            <div className="date"><label id="current_date"><br/></label></div>
            <input id="slider_date" type="range" min="0" max="10" step="1"/>
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
              <label>Select layer</label>
              <select id="layer" name="layer">
                <option value="water">Water</option>
                <option value="building">Buildings</option>
              </select>
            </fieldset>
            <fieldset>
              <label>Choose a color</label>
              <div id="swatches">
                <div className="blue">
                  <button id="blue_button" onClick={this.onDebug01} />
                </div>
                <div className="green">
                  <button id="green_button" onClick={this.onDebug02} />
                </div>
                <a href="/#" className="btn-square" onClick={this.onClickStart}>START</a>
              </div>
            </fieldset>
          </div>
        </div>
        { this.renderTooltip() }
      </DeckGL>
    );
  }
}

