import * as React from 'react';
import {PureComponent} from 'react';
import { datetostring } from "./server/util.mjs";
import Log from './logger.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Label
} from 'recharts';

export default class ChartPanel extends PureComponent
{
  state = {
    chart_view: 0,
    chart_include_whole: false
  };
  SHOW_HIDE_STYLES = [ "hidden", "show" ];
  SHOW_HIDE_TEXTS = [ "OPEN CHART OF", "CLOSE CHART OF" ];
  _onClickShowPanel = e => {
    e.stopPropagation();
    if ( this.props.summary )
      this.setState( { chart_view: this.state.chart_view ^ 1 } );
    this.props.onClickRelay( e );
  };
  _onClickCheckWhole = e => {
    e.stopPropagation();
    this.setState( { chart_include_whole: !this.state.chart_include_whole } );
    this.props.onClickRelay( e );
  };
  _buttonText = () => {
    if ( !this.props.summary )
      return "CLICK ANY SPOT";
    return `${this.SHOW_HIDE_TEXTS[ this.state.chart_view ]} ${this.props.summary.name}`;
  };

  _CustomTooltip = ({ active, payload, label }) => {
    return active && (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        { (payload.length > 1) && (<p className="desc">{`${this.props.summary_whole?.name} : ${payload[ 0 ].value + payload[ 1 ].value}`}</p>) }
        <p className="desc">{`${this.props.summary?.name} : ${(payload[ 0 ]).value}`}</p>
      </div>
    );
  };

  render() {
    const mapData = new Map();
    const data = [];
    if ( this.props.summary )
    {
      // 最新日付までデータを入れる
      for ( const cur = new Date( this.props.start_day ); ; cur.setDate( cur.getDate() + 1 ) )
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
    const curval = mapData.get( this.props.current_day );
    const is_whole_active = this.props.summary?.pref_code !== 0 && this.state.chart_include_whole;
    return (
      <div className="chart-panel">
        <div className="right"><div className="blue"><button className="btn-square-small" onClick={this._onClickShowPanel}>{this._buttonText()}</button></div></div>
        <div className={ this.SHOW_HIDE_STYLES[ (this.props.summary && this.state.chart_view) || 0 ] }>
          <div className="chart-title">Newly Infecteds of {this.props.summary?.name}</div>
          <div className="chart-area">
            <ResponsiveContainer>
              <AreaChart data={data} >
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
                { this.props.current_day && (<ReferenceLine x={this.props.current_day} stroke="green" />) }
                { this.props.current_day && curval && is_whole_active && (<ReferenceDot x={this.props.current_day} y={curval.whole + curval.pref} r={5} stroke="blue" ><Label position="right" value={curval.whole + curval.pref}/></ReferenceDot>) }
                { this.props.current_day && curval && (<ReferenceDot x={this.props.current_day} y={curval.pref} r={5} stroke="green" ><Label position="right" value={curval.pref}/></ReferenceDot>) }
              </AreaChart>
            </ResponsiveContainer>
          </div>
          { (this.props.summary?.pref_code !== 0) && (
            <div className="right">
              <div className="chart-switch">
                <div className="checkbox">
                  <label>
                    <input type="checkbox" className="checkbox-input" checked={this.state.chart_include_whole} onChange={this._onClickCheckWhole} />
                    <span className="checkbox-parts"> Compare with {this.props.summary_whole?.name}</span>
                  </label>
                </div>
              </div>
            </div> ) }
        </div>
      </div>
    );
  }
}

