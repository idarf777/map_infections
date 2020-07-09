import dotenv from 'dotenv';
//import agh from 'agh.sprintf';
import { config } from '../config.js';
import Log from '../logger.js';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
// CSRFは後の課題とする

dotenv.config();

const app = express();
app.use(express.static(path.join(config.ROOT_DIRECTORY, 'dist')));
app.use( helmet.xssFilter() );
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/api/1.0/infectors', (req, res) => {
  res.send({api: 'test'});
})

app.get('*', function (req, res) {
  res.sendFile(path.join(config.ROOT_DIRECTORY, 'dist', 'index.html'))
})

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
