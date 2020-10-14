import * as React from 'react';
import {PureComponent} from 'react';
import { datetostring } from "./server/util.mjs";
import Log from './logger.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

export default class ChartPanel extends PureComponent
{
  state = {
    chart_view: 0,
  };
  SHOW_HIDE_STYLES = [ "hidden", "show" ];
  SHOW_HIDE_TEXTS = [ "OPEN CHART OF", "CLOSE CHART OF" ];
  _onClickShowPanel = () => {
    if ( this.props.summary )
      this.setState( { chart_view: this.state.chart_view ^ 1 } );
  };
  _buttonText = () => {
    if ( !this.props.summary )
      return "CLICK ANY SPOT";
    return `${this.SHOW_HIDE_TEXTS[ this.state.chart_view ]} ${this.props.summary.name}`;
  };

  render() {
    const data = [];
    const cur = new Date( this.props.current_day );
    for ( const sm of this.props.summary?.subtotal || [] )
    {
      const rowdate = new Date( sm.date );
      if ( cur.getTime() > rowdate.getTime() )
        continue;
      data.push( { name: sm.date, infectors: sm.infectors } );
    }

    return (
      <div className="chart-panel">
        <div className="right"><div className="blue"><button className="btn-square-small" onClick={this._onClickShowPanel}>{this._buttonText()}</button></div></div>
        <div className={ this.SHOW_HIDE_STYLES[ (this.props.summary && this.state.chart_view) || 0 ] }>
          <div className="chart-title">{this.props.summary?.name}</div>
          <AreaChart
            data={data}
            width={500}
            height={400}
            margin={{
              top: 10, right: 30, left: 0, bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="infectors" stackId="1" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </div>
      </div>
    );
  }
}

