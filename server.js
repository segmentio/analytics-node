const express = require('express')
const analytics = require('.');


const app = express()

app.get('/test', function (req, res) {
  console.log('testing');
  new analytics('mykey', {host: 'http://localhost:3000/endpoint'});
  res.send({});
})

app.get('/endpoint', function (req, res) {
  console.log(req);
  res.send({'endpoint': 'true'});
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})