const express = require('express')
const Analytics = require('.')

const app = express()

app.get('/test', function (req, res) {
  console.log('testing')
  const client = new Analytics('mykey', {host: 'http://localhost:3000/endpoint'})
  console.log('Client: %j', client)

  res.send({})
})

app.get('/endpoint', function (req, res) {
  console.log(req)
  res.send({'endpoint': 'true'})
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
