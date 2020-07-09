import dotenv from 'dotenv';
//import agh from 'agh.sprintf';
import { config } from '../config.js';
import Log from '../logger.js';
import express from 'express';
import path from 'path';

dotenv.config();

const app = express();

app.use(express.static(path.join('./', 'dist')));

app.get('/api', (req, res) => {
  res.send({api: 'test'});
})

app.get('*', function (req, res) {
  res.sendFile(path.join('./', 'dist', 'index.html'))
})

app.listen( config.SERVER_PORT, () => {
  Log.info( `server is running at port ${config.SERVER_PORT}` );
});
