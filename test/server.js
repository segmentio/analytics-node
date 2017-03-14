var express = require('express')

/**
 * Port.
 */

exports.port = 4063

/**
 * App.
 */

exports.app = express()
  .use(express.bodyParser())
  .use(express.basicAuth('key', ''))

/**
 * Fixture.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Funtion} next
 */

exports.fixture = function (req, res, next) {
  var batch = req.body.batch
  if (batch[0] === 'error') {
    return res.json(400, { error: { message: 'error' } })
  }
  res.json(200)
}
