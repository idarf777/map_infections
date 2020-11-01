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

const DATA_API_STATUS = { unloaded: 'DATA UNLOAD', loading: 'LOADING DATA...', loaded: 'DATA LOADED', error: 'ERROR' };

export default class PageChart extends React.Component
{
  constructor(props) {
    super(props);
    // I'm using this ref to access methods on the DeckGL class
  }

  state = {
    pref_geojsons: [],
    srcdata: null,
    src_ids: null,
    begin_date: new Date(),
    finish_date: new Date(),
    max_day: 1,
    current_day: 0,
    data_api_loaded: DATA_API_STATUS.unloaded,
  };

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

  render() {
    Log.debug( this.state.srcdata );
    return (
      <div className="full-chart">
        <div className="text-left"><h3>{this.state.data_api_loaded}</h3></div>

        <div className="checkboxArea">
          <div className="list-prefectures">
            <ul>
              <li>
                <div className="chart-button-left">
                  <input type="checkbox" id="sample3check" />
                  <label htmlFor="sample3check"><span></span></label>
                </div>
                <div className="chart-button-left">
                  <a href="text014.html#hd_10">東京都</a>
                </div>
              </li>
              <li><a href="text014.html#hd_10">神奈川県</a></li>
              <li><a href="text014.html#hd_10">静岡県</a></li>
              <li><a href="text014.html#hd_10">愛知県</a></li>
              <li><a href="text014.html#hd_10">京都府</a></li>
            </ul>
          </div>
        </div>

        <div className="checkboxArea" id="makeImg">
          <input type="checkbox" id="sample3check" /><label htmlFor="sample3check"><span></span></label>
        </div>

      </div>
    );
  }
}

