import bodyParser from 'body-parser'
import express from 'express'

exports.port = 4063

exports.app = express()
  .use(bodyParser.json())
  .post('/v1/batch', (req, res) => {
    const batch = req.body.batch

    if (batch[0] === 'error') {
      return res.status(400).json({
        error: { message: 'error' }
      })
    }

    res.json({})
  })
