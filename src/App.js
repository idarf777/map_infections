import dotenv from 'dotenv';
import * as React from 'react';
import MapGL, {_MapContext as MapContext, NavigationControl} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import InfectorsLayer from "./infectors_layer.js";
import {HexagonLayer} from '@deck.gl/aggregation-layers';
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
const upperPercentile = 100

export default class App extends React.Component
{
  state = {
    viewport: {
      latitude: MAP_CENTER[ 1 ],
      longitude: MAP_CENTER[ 0 ],
      zoom: MAP_ZOOM,
      bearing: 0,
      pitch: MAP_PITCH
    },
    interactionState: {}
  };

  getElevationValue( d )
  {
    //console.log( `VALUE: ${d}` );
    return d[ 0 ].value;
  }
  getGeopos( d )
  {
    return d.geopos;
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

  render() {
    const {viewport, interactionState} = this.state;
    const data = [ { geopos: [ MAP_CENTER[ 0 ], MAP_CENTER[ 1 ] ], value: 1000, desc: '富士市瓜島町' }, { geopos: [138.621662, 35.222224], value: 10, desc: '富士宮市役所' } ];

    const hexagonLayer = new HexagonLayer({
      id: "heatmap",
      data,
      colorRange: colorRange,
      coverage: coverage,
      getColorValue: d => d[ 0 ].value,
      getElevationValue: this.getElevationValue,
      elevationScale: 10,
      elevationDomain: [0, 1000], // 入力値の最小／最大 デフォルトでは各マスに入る行の密度となる
      elevationRange: [0, 1000],  // 入力値をelevationDomainで正規化したあと、この幅にあてはめる
      colorDomain: [0, 1000],     // elevationRangeにあてはめた値を、この幅にあてはめて色を決める
      extruded: true,
      getPosition: this.getGeopos,
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

    return (
      <DeckGL
        initialViewState={ viewport }
        controller={true}
        ContextProvider={MapContext.Provider}
        layers={[hexagonLayer]}
      >
        <MapGL
          mapStyle={MAP_STYLE}
          mapboxApiAccessToken={process.env.REACT_APP_MapboxAccessToken}
        />
        <div className="navigation-control">
          <NavigationControl />
        </div>
        { this.renderTooltip() }
      </DeckGL>
    );
  }
}

