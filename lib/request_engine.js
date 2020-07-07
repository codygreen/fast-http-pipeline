const fs = require('fs')
const _http = require('http');
const _https = require('https');
const util = require('util');
const url = require('url');
const yaml = require('js-yaml');
var jp = require('jsonpath');


const USER_AGENT_STRING = 'fast pipeline prototype 0.1.0'

const parseContentDisposition = (string) => {
  const parts = string.split(';')
  const dict = parts[1].trim().split('=')


  if(parts[0]!== 'attachment' || parts.length !== 2 || dict.length !== 2)
    throw new Error('content-disposition format unsupported: '+string);

  return {
    type: parts[0],
    filename: dict[1]
  }
}

const makeRequest = (opts, payload) => {
  const protocol = opts.protocol === 'http:' ? _http : _https;

  if(!opts.headers)
    opts.headers = {};

  if(!opts.headers['User-Agent']) {
    opts.headers['User-Agent'] = USER_AGENT_STRING;
  }
  console.log('makeRequest', opts);
  return new Promise((resolve, reject) => {
    const req = protocol.request(opts, (res) => {
      console.log(res.statusCode);
      console.log(res.headers);

      res.on('error', (err) => {
        console.error('response error;'+err);
      });

      if( res.statusCode >= 300 && res.statusCode < 400 ) {
        if(res.headers && res.headers.location) {
          const parsed = url.parse(res.headers.location);
          return makeRequest(Object.assign(opts, parsed), payload);
        } else {
          return reject(new Error('Redirected, but No Location header'));
        }
      }

      if( res.headers['content-type'] === 'application/octet-stream') {
        // handle file download, works on github at least...
        const cd = parseContentDisposition(res.headers['content-disposition']);

        //const fstream = fs.createWriteStream(cd.filename, {autoclose: false});
        //res.pipe(fstream);
        let bytes_recieved = 0;
        res.on('data', (data) => {
          bytes_recieved += data.length
        })
        res.on('end', () => {
          console.log(`${bytes_recieved} recieved`)
          return resolve({
            options: opts,
            status: res.statusCode,
            headers: res.headers,
            file: cd.filename
          });
        });

      } else {
        // ... other content assumed to be utf8, for now ...
        const buffer = [];
        res.setEncoding('utf8');
        res.on('data', (data) => {
          buffer.push(data);
        });
        res.on('end', () => {
          let body = buffer.join('');
          return resolve({
            options: opts,
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      }
    });

    req.on('error', (e) => {
      console.log('other side is mean')
      //reject(new Error(`${opts.host}:${e.message}`));
    });

    if (payload) req.write(JSON.stringify(payload));
    req.end();
  })
  .catch((e) => {
    throw new Error(`makeRequest: ${e.stack}`);
  })
};

const url2opts = s => s ? url.parse(s) : {};

module.exports = {
  makeRequest,
  url2opts
}
