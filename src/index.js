import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App.js';
import * as serviceWorker from './serviceWorker.js';
const config = window.covid19map.config;
const cookies = new Map();
if ( document.cookie )
{
  document.cookie.split( ';' ).forEach( c => {
    const cs = c.split( '=' ).map( v => v.trim() );
    if ( cs[ 1 ] !== '' )
      cookies.set( cs[ 0 ], cs[ 1 ] );
  } );
}
const t = process.env.REACT_APP_MapboxAccessToken || cookies.get( config.MAP_TOKEN_COOKIE );
const app = t ? <App accessToken={t} /> : <p>{ 'ACCESSES EXCEEDED IN THIS MONTH' }</p>;
ReactDOM.render(
  <React.StrictMode>
    <div id="map">{ app }</div>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
