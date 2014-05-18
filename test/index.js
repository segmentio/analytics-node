var server = require('./server');
var Mocha = require('mocha');
var fs = require('fs');
var path = require('path');

var mocha = new Mocha({ reporter: 'spec' });
mocha.addFile(path.join(__dirname, 'tests.js'));
mocha.run(function(failures){
  process.exit(failures);
});
