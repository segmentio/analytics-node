
var should = require('should'),
    Client = require('../lib/client');


var options = {

    host : 'http://localhost:81',
    flushSize : 1

};


describe('Batch', function () {

    var visitorId = 'test@segment.io',
        sessionId = '123456789',
        apiKey    = 'fakeid';

    var seg = new Client(apiKey, options);


    it('should properly identify', function (done) {

        seg.identify({ visitor : visitorId,
                       session : sessionId,
                       traits  : { baller : true }}, function (err, result) {

            should.not.exist(err);

            done();
        });
    });

    it('should properly track', function (done) {

        seg.track({ visitor : visitorId,
                    event   : 'Ate a cookie' }, function (err, result) {

            should.not.exist(err);

            done();
        });
    });


});