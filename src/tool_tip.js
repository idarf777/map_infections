import * as React from 'react';
import {PureComponent} from 'react';

export default class ToolTip extends PureComponent {
  render() {
    return this.props.visible ? (
      <div className="tooltip" style={{left: this.props.sx, top: this.props.sy}}>
        <div className="tooltip-desc">{ (this.props.descriptions || []).map( d => <p key={d.substr( 0, d.indexOf( ' ' ) )}>{d}</p> ) }</div>
      </div>
    ) : ('');
  }
}
