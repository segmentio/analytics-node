
var Client = require('../lib/client');


var options = {

    host : 'http://localhost:81',
    flushSize : 1

};


describe('Batch', function () {

    var visitorId = 'test@segment.io';
    var sessionId = 'test@segment.io';

    it('should properly identify', function (done) {

        var seg = new Client('fakeid', options);

        seg.identify(visitorId, sessionId, { baller : true }, function (err, result) {
            console.log(err, result);
            done();
        });
    });
});