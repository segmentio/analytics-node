
var basicAuth = require('basic-auth-connect');
var bodyParser = require('body-parser');
var debug = require('debug')('analytics-node:server')
var express = require('express');
var http = require('http');
var httpProxy = require('http-proxy');
var ports = { source: 4063, proxy: 4064 };

/**
 * Proxy.
 */

var proxy = httpProxy.createProxyServer();

http.createServer(function(req, res) {
  proxy.web(req, res, { target: 'http://localhost:' + ports.source });
}).listen(ports.proxy, function(){
    console.log();
    console.log('  Testing proxy listening on port ' + ports.proxy + '...');
    console.log();
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  proxyRes.statusCode = 408;
});

/**
 * App.
 */

express()
  .use(bodyParser.json())
  .use(basicAuth('key', ''))
  .post('/v1/batch', fixture)
  .listen(ports.source, function(){
    console.log();
    console.log('  Testing server listening on port ' + ports.source + '...');
    console.log();
  });

/**
 * Fixture.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Funtion} next
 */

function fixture(req, res, next){
  var batch = req.body.batch;
  if ('error' == batch[0]) return res.status(400).json({ error: { message: 'error' }});
  res.json(200);
}
