const _http = require('http');
const _https = require('https');
const url = require('url');
const yaml = require('js-yaml');

const { makeRequest, url2opts } = require('./request_engine.js');

var jp = require('jsonpath');


const requestStageBuilder = (stageConfig) => {
  //opts -> the options for the next stage
  //result -> the result from the last stage
  console.log('building stageConfig');
  return (result) => {
    //var names = jp.query(, '$..name');
    console.log('chain builder task');
    console.log(result);
    const options = {};

    if( result.body ) {
      try {
        result.body = JSON.parse(result.body);
      } catch(e) {
        console.log('failed attempt to JSON.parse');
        console.log(result.body);
      }
    }


    // handle json path in URL, query result
    if(stageConfig.url.indexOf('$') === 0) {
      const locations = jp.query(result, stageConfig.url);
      if(locations.length === 1)
        Object.assign(options, url2opts(locations[0]));
      else {
        throw new Error(`Ambiguous or unresolved location:
          Object: ${result}
          JSONpath: ${stageConfig.url}
          Result: ${locations}`);
      }
    } else {
      const opts = url2opts(stageConfig.url);
      Object.assign(options, opts);
    }

    // overlay user options on URL inference
    Object.assign(options, stageConfig.options);

    // prepare body. TODO: follow yaml property branches to find json path leaves
    // reuse result body in post if there is one, use stage config body
    // if neither is specified, a body will not be sent
    const body = result.body || stageConfig.body;
    console.log('making request:', options, body);
    return makeRequest(options, body)
  }
}

const taskRouter = (config) => {
  console.log('routing config task', config);
  if(config.task === 'Request') {
    return requestStageBuilder(config);
  } else {
    throw new Error('No job for ' + JSON.stringify(config,null,2));
  }
}

const chainBuilder = (promise_list) => {
  console.log('chainBuilder');
  console.log(promise_list.toString());

  return (input) => {
    console.log(input);
    let count = 0;
    return promise_list.reduce((agg, cur) => {
      return agg
        .then((result) => {
          count++;
          return cur(result);
        })
        .catch((err) => {
          throw new Error(`index ${count} ${err.stack}`);
        });
    }, Promise.resolve(input))
  }
};

module.exports = {
  taskRouter,
  chainBuilder
}
