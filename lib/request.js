
var _         = require('underscore'),
    urlParser = require('url'),
    http      = require('http'),
    https     = require('https');

/*
 * FROM: https://gist.github.com/1393666
 *
 * UrlReq - Wraps the http.request function making it nice for unit testing APIs.
 *
 * @param  {string}   url       The required url in any form
 * @param  {Object}   options   An options object (this is optional)
 * @param  {Function} callback  This is passed the 'res' object from your request
 *
 */
module.exports = function(url, options, callback){

    if(_.isFunction(options)) {
        callback = options;
        options = {};
    }

    url = urlParser.parse(url);

    var settings = {
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        headers: options.headers || {},
        method: options.method
    };

    // if there are params:
    if(options.params){
        options.params = JSON.stringify(options.params);
        settings.headers['Content-Type'] = 'application/json';
        settings.headers['Content-Length'] = options.params.length;
    }

    // Decide whether to make a secure request.
    var req = url.protocol === 'https://' ? https.request(settings) :
                                            http.request(settings);

    // if there are params: write them to the request
    if(options.params) {
        req.write(options.params);
    }

    req.on('error', function (err) {
        callback(err);
    });

    // when the response comes back
    req.on('response', function(res){

        res.body = '';
        res.setEncoding('utf-8');

        // concat chunks
        res.on('data', function(chunk) {
            res.body += chunk;
        });

        // when the response has finished
        res.on('end', function(){

            // fire callback
            callback(null, res.body, res);
        });

    });

    // end the request
    req.end();
};