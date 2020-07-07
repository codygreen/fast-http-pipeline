/**

  FAST HTTP Pipeline
  Author: Matthew Zinke <m.zinke@f5.com>

  FAST HTTP will quickly stand up an HTTP services for making
  pipelined HTTP calls.



*/

const {
  taskRouter,
  chainBuilder } = require('./lib/http_pipeline.js');

const {
  makeRequest,
  url2opts } = require('./lib/request_engine.js');

module.exports = {
  taskRouter,
  chainBuilder,
  makeRequest,
  url2opts
}
