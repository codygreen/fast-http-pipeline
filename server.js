/**

  FAST HTTP
  Author: Matthew Zinke <m.zinke@f5.com>

  FAST HTTP will quickly stand up an HTTP service for rendering
  volume mounted FAST Templates.

  Each template in the volume will be mapped to a URL endpoint
  using the title in the template.

*/

const fs = require('fs');
const http = require('http');

const util = require('util');
const ls = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

const yaml = require('js-yaml');
const app = require('polka');

const {
  taskRouter,
  chainBuilder,
  makeRequest,
  url2opts } = require('.');


const basedir = process.env.F5_FAST_PIPELINE_ROOT || './pipelines';
const pipelines = {};

console.log(`basedir ${basedir}`);

const simpleTestPoc = (input) => input*2;

const httpListPipelines = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(Object.keys(pipelines)));
};

const httpGetPipeline = (req, res) => {
  const press = pipelines[req.params.path.toLowerCase()];
  if(press) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(press));
  } else {
    res.end('404: template not found');
  }
};

const httpPostPipeline = (req, res) => {
  const press = pipelines[req.params.path.toLowerCase()];
  if(press) {
    const buffer = [];
    req.on('data', (data) => {
      buffer.push(data.toString('utf8'));
    });
    req.on('end', () => {
      const params = JSON.parse(buffer.join(''));
      console.log(params);
      console.log(press);
      // EXECUTE PIPELINE
      const config = press.stages
      console.log(config);
      if( config instanceof Array ) {
        return chainBuilder(config.map(stage => taskRouter(stage)))(params)
          .then((result) => {
            // DONE , result holds result
            console.log(result);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          });
      } else {
        return taskRouter(config)(params)
          .then((result) => {
            // DONE , result holds result
            res.end(result);
          });
      }
    });
    req.on('error', () => {
      res.end('500: template error');
    });
  } else {
    res.end('404: template not found');
  }
};

const server = app();
server.get('/', httpListPipelines);
server.get('/:path', httpGetPipeline);
server.post('/:path', httpPostPipeline);

//main promise chain listens on port 3000
ls(basedir)
  .then((list) => {
    return Promise.all(list.map(fname => readFile(basedir + '/' + fname)));
  })
  .then((results) => {
    const files = results.map(x => x.toString('utf8'));
    return Promise.all(files.map(y => yaml.safeLoad(y)));
  })
  .then((results) => {
    results.forEach((ptemplate) => {
      try {
        pipelines[ptemplate.title.toLowerCase()] = ptemplate;
        console.log(ptemplate.title, 'loaded');
      } catch(e) {
        console.log('pipeline had no title, could not be loaded');
      }
    });
    // template set loaded in cache at this point

    //server start
    server.listen(3000);
  });
