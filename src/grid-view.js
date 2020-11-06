import * as React from 'react';
import {PureComponent} from 'react';
import { datetostring } from "./server/util.mjs";
//import Log from './logger.js';

export default class GridView extends PureComponent
{
  render()
  {
    return (this.props.data || null) && (
      <div className="scrollable-textbox">
        <table>
          <thead>
            <tr>
            {
              this.props.header?.map( v => (<th key={v}>{ v }</th>) )
            }
            </tr>
          </thead>
          <tbody>
          {
            this.props.data.map( (vs, i) => (
              <tr key={`${vs[ this.props.data_key_column ]}_${i}`}>
              {
                (this.props.data_keys || this.props.header).map( k => (<td key={k}>{ k.endsWith( '_at' ) ? datetostring( vs[ k ] ) : vs[ k ] }</td>) )
              }
              </tr>
            ) )
          }
          </tbody>
        </table>
      </div>
    );
  }
}
