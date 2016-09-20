'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const stream = require('stream');

describe('IssLocationStream', function () {
  const iss = require('../lib/IssLocationStream');
  var ISS = null;
  var sandbox = null;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    ISS = new iss();
  });

  afterEach(function () {
    ISS = null;
    sandbox.restore();
  });

  it("should be defined", function () {
    expect(iss).to.be.a('function');
  });

  it("should extend stream.Readable", function () {
    expect(stream.Readable.prototype.isPrototypeOf(ISS)).to.be.true;
  });

  it("should instantiate with certain class properties", function () {
    const expectedProps = ['validSatIds', 'DEFAULT_SAT_ID', 'satellite', 'interval', 'dataSource', 'lag', 'reqs', 'resps', 'opts'];
    
    expect(ISS).to.be.an('object');

    for (let p=0; p<expectedProps.length; p++) {
      expect(ISS).to.have.property(expectedProps[p]);
    }
  });

  describe("getSatId", function () {
    beforeEach(function () {
      ISS.validSatIds = ['testOne', 'testTwo'];
      ISS.DEFAULT_SAT_ID = 'testOne';
    })

    it("returns the passed sat ID if it's valid", function () {
      expect(ISS.getSatId('testOne')).to.equal('testOne');
    });

    it("returns the default sat ID if the passed ID is not valid", function () {
      expect(ISS.getSatId('testThree')).to.equal('testOne');
    });
  });

  describe("adjustForLag", function () {
    beforeEach(function () {
      ISS.interval = 10;
    });

    it("returns the difference between the interval and the lag if it's greater than 0", function () {
      ISS.lag = 5;
      expect(ISS.adjustForLag()).to.equal(5);
    });

    it("returns 0 if the lag is greater than the interval", function () {
      ISS.lag = 15;
      expect(ISS.adjustForLag()).to.equal(0);
    });
  });

  describe("pause", function () {
    var unmakeTimeoutStub = null;

    beforeEach(function () {
      unmakeTimeoutStub = sandbox.stub(ISS, 'unmakeTimeout');
    });

    it("clears the timeout if timer is present", function () {
      ISS.timer = 12345;
      ISS.pause();

      expect(unmakeTimeoutStub).to.be.called;
    });

    it("doesn't clear the timeout if timer is not present", function () {
      ISS.timer = null;
      ISS.pause();

      expect(unmakeTimeoutStub).to.not.be.called;
    });

    it("pauses the stream", function () {
      ISS.pause();

      expect(ISS.isPaused()).to.be.true;
    });
  });

  describe("_read", function () {
    var makeTimeoutStub = null;
    var isPausedStub = null;

    beforeEach(function () {
      isPausedStub = sandbox.stub(ISS, 'isPaused');
      makeTimeoutStub = sandbox.stub(ISS, 'makeTimeout');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it("does nothing if paused", function () {
      isPausedStub.returns(true);

      ISS._read();

      expect(makeTimeoutStub).to.not.be.called;
    });

    it("creates a timer with getDataFromSource and adjustForLag if not paused", function () {
      var adjustForLagStub = sandbox.stub(ISS, 'adjustForLag').returns(42);
      isPausedStub.returns(false);

      ISS._read();

      expect(makeTimeoutStub).to.be.called;
      expect(makeTimeoutStub.args[0][0]).to.equal(ISS.getDataFromSource);
      expect(makeTimeoutStub.args[0][1]).to.equal(42);
    });
  });

  describe("getDataFromSource", function () {
    var mockRequestStub = null;
    var pushStub = null;

    beforeEach(function () {
      pushStub = sandbox.stub(ISS, 'push');

      mockRequestStub = function () {
        var self = this;
        var resolve, reject;
        var mockPromise = {
          'then': function (cb) {
            this.resolve = cb;
            return this;
          },

          'catch': function (cb) {
            this.reject = cb;
            return this;
          }
        }

        return mockPromise;
      }

      ISS.dataSource = {
        makeRequest: mockRequestStub
      }
    });

    afterEach(function () {
      mockRequestStub = null;
    });

    it("increments reqs property", function () {
      ISS.reqs = 41;

      ISS.getDataFromSource();

      expect(ISS.reqs).to.equal(42);
    });

    it("sets class prop startReq as a number", function () {
      ISS.getDataFromSource();

      expect(typeof ISS.startReq).to.equal('number');
    });

    it("makes the request from the data source", function () {
      var makeRequestStub = sandbox.stub(ISS.dataSource, 'makeRequest').returns(new Promise( (resolve, reject)=>{} ));

      ISS.getDataFromSource();

      expect(makeRequestStub).to.be.called;
    });

    it("increments class prop resps on resolution", function () {
      ISS.resps = 100;
      var async;

      async = ISS.getDataFromSource();
      async.resolve();

      expect(ISS.resps).to.equal(101);
    });

    it("measures the lag of time resolution took", function () {
      var dateNowStub = sandbox.stub(Date, 'now').returns(49);
      var async;

      async = ISS.getDataFromSource();
      ISS.startReq = 42;
      async.resolve();

      expect(ISS.lag).to.equal(7);
    });

    it("calls push with the passed value", function () {
      var testVal = 'random value from data source';
      var async = ISS.getDataFromSource();

      async.resolve(testVal);

      expect(pushStub.calledWith(testVal)).to.be.true;
    });
  });
});