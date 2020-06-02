import dotenv from 'dotenv';
import agh from 'agh.sprintf';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import InfectorsLayer from "./infectors_layer.js";
import ControlPanel from './control-panel.js';
import './App.css';

dotenv.config();
const MAP_STYLE = 'mapbox://styles/mapbox/light-v10';
const MAP_ZOOM = 10;
const MAP_PITCH = 40;
const MAP_CENTER = [138.6728926, 35.1637692];
const colorRange = [
  [1, 152, 189],
  [73, 227, 206],
  [216, 254, 181],
  [254, 237, 177],
  [254, 173, 84],
  [209, 55, 78]
];
const coverage = 1.0;
const upperPercentile = 100;
const MAX_INFECTORS = 100;
const data = [ { geopos: [ MAP_CENTER[ 0 ], MAP_CENTER[ 1 ] ], value: 100, desc: '富士市瓜島町' }, { geopos: [138.621662, 35.222224], value: 10, desc: '富士宮市役所' } ];

export default class App extends React.Component
{
  createLayer = ( count ) => new InfectorsLayer({
    id: `3dgram${count}`,
    data,
    coverage: coverage,
    getColorValue: d => d[ 0 ].value,
    getElevationValue: this.getElevationValue,
    elevationScale: 10,
    elevationDomain: [0, MAX_INFECTORS], // 棒の高さについて、この幅で入力値を正規化する デフォルトでは各マスに入る行の密度(points.length)となる
    elevationRange: [0, 1000],           // 入力値をelevationDomainで正規化したあと、この幅で高さを決める
    colorDomain: [0, MAX_INFECTORS],     // 棒の色について、この幅で入力値を正規化する
    colorRange: colorRange,
    extruded: true,
    getPosition: d => d.geopos,
    opacity: 1.0,
    pickable: true,
    radius: 500,
    upperPercentile: upperPercentile,
    onHover: info => this.setState({
      hoveredObject: info.object,
      pointerX: info.x,
      pointerY: info.y
    })
  });

  state = {
    viewState: {
      latitude: MAP_CENTER[ 1 ],
      longitude: MAP_CENTER[ 0 ],
      zoom: MAP_ZOOM,
      bearing: 0,
      pitch: MAP_PITCH
    },
    layercount: 0,
    maplayer: this.createLayer( 0 )
  };

  getElevationValue( d )
  {
    //console.log( `VALUE: ${d}` );
    return d[ 0 ].value;
  }

  renderTooltip()
  {
    const {hoveredObject, pointerX, pointerY} = this.state || {};
    return hoveredObject && (
      <div className="tooltip" style={{left: pointerX, top: pointerY}}>
        <div className="tooltip-desc">{ hoveredObject.points[ 0 ].desc }</div>
      </div>
    );
  }

  redrawLayer()
  {
    this.setState(
      (state, props) => { return { layercount: this.state.layercount ^ 1 } },
      () => this.setState( { maplayer: this.createLayer( this.state.layercount ) } )
    );
  }

  _onViewStateChange = ({viewState}) => {
    this.setState( {viewState} );
  };

  onDebug01 = () =>
  {
    data[ 0 ].value *= 0.5;
    this.redrawLayer();
  }

  render() {
    return (
      <DeckGL
        viewState={ this.state.viewState }
        onViewStateChange={this._onViewStateChange}
        controller={true}
        ContextProvider={MapContext.Provider}
        layers={[ this.state.maplayer ]}
      >
        <MapGL
          mapStyle={MAP_STYLE}
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
            <div style={{float: "right"}}>{MAX_INFECTORS}</div>
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
                  <button id="green_button" />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        { this.renderTooltip() }
      </DeckGL>
    );
  }
}

