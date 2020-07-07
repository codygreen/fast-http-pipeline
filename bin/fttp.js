/**
* FAST Template Transfer Protol
*
* Use FAST templates between HTTP calls to manage
* string complex API dependency chains
*
* This command takes a filename and runs the HTTP pipeline configured within.
*/
const util = require('util');
const fs = require('fs');
const yaml = require('js-yaml');

const {
  taskRouter,
  chainBuilder,
  makeRequest,
  url2opts } = require('../');

const fname = process.argv.pop();

console.log(fname);

const readFile = util.promisify(fs.readFile);

readFile(fname)
  .then((script) => {
    const raw = script.toString('utf8');
    const config = yaml.safeLoad(raw);
    console.log(config);
    if( config instanceof Array ) {
      return chainBuilder(config.map(stage => taskRouter(stage)))({});
    } else {
      return taskRouter(config)({});
    }
  })
  .then((result) => {
    console.log('final', result.body);
  })
  .catch((err) => {
    console.error(err);
  })
