/* global describe, it */

var assert = require('assert')
var AnalyticsMock = require('../mock')

describe('AnalyticsMock', function () {
  it('should not require `new`', function () {
    var mock = AnalyticsMock()
    assert(mock instanceof AnalyticsMock)
  })

  it('should expose all methods', function () {
    var mock = new AnalyticsMock()
    assert.equal(typeof mock.identify, 'function')
    assert.equal(typeof mock.group, 'function')
    assert.equal(typeof mock.track, 'function')
    assert.equal(typeof mock.page, 'function')
    assert.equal(typeof mock.screen, 'function')
    assert.equal(typeof mock.alias, 'function')
    assert.equal(typeof mock.flush, 'function')
  })

  it('should callback', function (done) {
    var mock = new AnalyticsMock()
    mock.track({ foo: 'bar' }, done)
  })
})
