import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App.js';
import axios from 'axios';
import * as serviceWorker from './serviceWorker.js';
import Log from "./logger.js";
const config = window.covid19map.config;

function renderReact( token, err )
{
  const app = token ? <App /> : <p>{ (err === config.SERVER_AUTHORIZE_ERRORCODE) ? 'ACCESSES EXCEEDED IN THIS MONTH' : 'SERVER ERROR' }</p>;
  ReactDOM.render(
    <React.StrictMode>
      <div id="map">{ app }</div>
    </React.StrictMode>,
    document.getElementById('root')
  );
}

if ( process.env.REACT_APP_MapboxAccessToken )
{
  renderReact( process.env.REACT_APP_MapboxAccessToken );
}
else
{
  let mbtoken = null;
  let mberror = null;
  const host = config.SERVER_HOST || `${window.location.protocol}://${window.location.host}`;
  axios.post( `${host}${config.SERVER_AUTHORIZE_URI}` )
    .then( ( response ) => {
      Log.debug( response );
      mbtoken = response.data?.token;
      if ( (mbtoken?.length || 0) === 0 )
        throw new Error( 'invalid server response' );
    } )
    .catch( ( ex ) => {
      Log.error( ex );
      mberror = ex.response.status;
    } ).finally( () => {
      renderReact( mbtoken, mberror );
    } );
}
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
