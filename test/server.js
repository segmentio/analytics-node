
var express = require('express');
var port = 4063;

/**
 * App.
 */

express()
  .use(express.bodyParser())
  .use(express.basicAuth('key', ''))
  .post('/v1/batch', fixture)
  .listen(port, function(){
    console.log();
    console.log('  Testing server listening on port ' + port + '...');
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
  if ('error' == batch[0]) return res.json(400, { error: { message: 'error' }});
  res.json(200);
}
