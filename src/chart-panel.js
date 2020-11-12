import * as React from 'react';
import {withRouter} from 'react-router-dom';
import {PureComponent} from 'react';
import { datetostring } from "./server/util.mjs";
import Log from './logger.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Label
} from 'recharts';
import GridView from "./grid-view";

class ChartPanel extends PureComponent
{
  state = {
    chart_view: false,
    chart_include_whole: false,
    chart_details_view: false,
    current_date: null
  };
  SHOW_HIDE_STYLES = [ "hidden", "show" ];
  SHOW_HIDE_TEXTS = [ "OPEN CHART OF", "CLOSE CHART OF" ];
  _onClickShowPanel = e => {
    e.stopPropagation();
    if ( this.props.summary )
      this.setState( { chart_view: !this.state.chart_view } );
    this.props.onClickRelay( e );
  };
  _onClickViewFullChart = e => {
    e.stopPropagation();
    this.props.history.push( '/chart' );
    this.props.onClickRelay( e );
  };
  _onClickCheckWhole = e => {
    e.stopPropagation();
    this.setState( { chart_include_whole: !this.state.chart_include_whole } );
    this.props.onClickRelay( e );
  };
  _onClickShowDetails = e => {
    e.stopPropagation();
    this.setState( { chart_details_view: !this.state.chart_details_view } );
    this.props.onClickRelay( e );
  };
  _onClickNull = e => {
    e.stopPropagation();
    this.props.onClickRelay( e );
  };
  _buttonText = () => this.props.summary ? `${this.SHOW_HIDE_TEXTS[ this.state.chart_view ? 1 : 0 ]} ${this.props.summary.name}` : "CLICK ANY SPOT";
  _CustomTooltip = ({ active, payload, label }) => {
    return (label && active && (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        { (payload.length > 1) && (<p className="desc">{`${this.props.summary_whole?.name} : ${payload[ 0 ].value + payload[ 1 ].value}`}</p>) }
        <p className="desc">{`${this.props.summary?.name} : ${(payload[ 0 ]).value}`}</p>
      </div>
    )) || null;
  };
  _onMouseMove = ( info, ev ) => this.setState( { current_date: info?.activeLabel || null } );

  _onDebugChart01 = ev => Log.debug( this.state );

  display_date()
  {
    return this.state.current_date || this.props.current_date;
  }
  elapsed_days( curdate )
  {
    return Math.round( (new Date( curdate ).getTime() - this.props.srcdata.begin_at.getTime()) / (24*60*60*1000) ); // データ開始日からの日数
  }
  makeTable()
  {
    const curdate = this.display_date();
    return curdate && this.props.srcdata && ((this.props.summary?.pref_code || 0) > 0) &&
      (this.props.srcdata.map_pref_places.get( this.props.summary.pref_code ) || [])
      .map( idx => [ this.props.srcdata.places[ idx ].name.replace( new RegExp( `^${this.props.summary.name}` ), '' ), this.props.srcdata.infectors[ idx ][ this.elapsed_days( curdate ) ], this.props.srcdata.places[ idx ].city_code ] )
      .sort( (a, b) => {
        const ccf = v => ((v % 1000) === 0) ? (v + 999) : v; // 該当地がないPOIは最後にする
        const c = ccf( a[ 2 ] ) - ccf( b[ 2 ] );  // city_codeの昇順でソート
        return (c === 0) ? (a[ 0 ] > b[ 0 ]) : c;
      } )
      .map( v => { return { place: v[ 0 ], infectors: v[ 1 ].toString() } } );
  }

  render()
  {
    const mapData = new Map();
    const data = [];
    if ( this.props.summary )
    {
      // 最新日付までデータを入れる
      for ( const cur = new Date( this.props.start_date ); ; cur.setDate( cur.getDate() + 1 ) )
      {
        const d = datetostring( cur );
        const pref = this.props.summary.map.get( d )?.infectors || 0;
        const whole = this.props.summary_whole.map.get( d )?.infectors; // 全国版は、最新日付までの全ての日付についてデータがあるはず
        if ( whole == null )
          break;
        const h = { name: d, pref, whole: whole - pref };
        data.push( h );
        mapData.set( d, h );
      }
    }
    const curval = this.props.current_date && mapData.get( this.props.current_date );
    const is_local_pref = this.props.summary?.pref_code !== 0;
    const is_whole_active = is_local_pref  && this.state.chart_include_whole;
    return (
      <div className="chart-panel" onClick={this._onClickNull} >
        <div className="text-right">
          <div className="blue">
            <button className="btn-square-small" onClick={this._onClickShowPanel}>{this._buttonText()}</button>
          </div>
        </div>
        <div className="chart-button-right">
          <div className="green">
            <button className="btn-square-small" onClick={this._onClickViewFullChart}>VIEW FULL CHART</button>
          </div>
        </div>
        { window.covid19map.config.DEBUG && (
        <div className="chart-button-right">
          <div className="green">
            <button className="btn-square-small" onClick={this._onDebugChart01}>DEBUG</button>
          </div>
        </div> ) }
        <div className={ this.SHOW_HIDE_STYLES[ (this.props.summary && this.state.chart_view) ? 1 : 0 ] }>
          <div className="chart-panel-left">
            { is_local_pref && this.state.chart_details_view && (
              <div>
                <div className="chart-title">
                  {this.display_date()}
                </div>
                <GridView header={['place', 'infectors']} data={this.makeTable()} data_key_column={'place'} />
              </div>
            ) }
          </div>

          <div className="chart-panel-right">
            <div className="chart-title">Newly Infecteds of {this.props.summary?.name}</div>
            <div className="chart-area">
              <ResponsiveContainer>
                <AreaChart data={data} onMouseMove={this._onMouseMove} >
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004040" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#00a0a0" stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="colorUvWhole" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#404000" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#a0a000" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<this._CustomTooltip />} />
                  <Area type="monotone" dataKey="pref" stackId="1" stroke="#606080" fill="url(#colorUv)" />
                  { is_whole_active && (<Area type="monotone" dataKey="whole" stackId="1" stroke="#806060" fill="url(#colorUvWhole)" />) }
                  { this.props.in_animation && curval && (<ReferenceLine x={this.props.current_date} stroke="green" />) }
                  { this.props.in_animation && curval && is_whole_active && (<ReferenceDot x={this.props.current_date} y={curval.whole + curval.pref} r={5} stroke="blue" ><Label position="right" value={curval.whole + curval.pref}/></ReferenceDot>) }
                  { this.props.in_animation && curval && (<ReferenceDot x={this.props.current_date} y={curval.pref} r={5} stroke="green" ><Label position="right" value={curval.pref}/></ReferenceDot>) }
                </AreaChart>
              </ResponsiveContainer>
            </div>
            { is_local_pref && (
              <div className="text-right">
                <div className="chart-switch">
                  <div className="chart-button-left">
                    <div className="thin-border">
                      <div className="lightblue">
                        <button className="btn-square-small" onClick={this._onClickShowDetails}>{'<<DETAILS'}</button>
                      </div>
                    </div>
                  </div>
                  <div className="chart-button-right">
                    <label>
                      <input type="checkbox" className="checkbox-input" checked={this.state.chart_include_whole} onChange={this._onClickCheckWhole} />
                      <span className="checkbox-parts"> Draw {this.props.summary_whole?.name}</span>
                    </label>
                  </div>
                </div>
              </div> ) }
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter( ChartPanel );
