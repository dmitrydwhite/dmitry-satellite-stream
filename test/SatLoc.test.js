'use strict';

/**
 * Unit tests for SatLoc.js
 */
const expect = require('chai').expect;
const sinon = require('sinon');

const https = require('https');

describe("SatLoc", function () {
  const sat = require('../lib/SatLoc');
  var SAT = null;
  var sandbox = null;
  var httpsStub = null;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    httpsStub = sandbox.stub(https, 'get');
    SAT = new sat();
  });

  afterEach(function () {
    sandbox.restore();
    SAT = null;
  });

  it("should be defined", function () {
    expect(sat).to.be.a('function');
    expect(SAT).to.be.an('object');
  });

  describe("makeRequest", function () {
    it("should return a Promise", function () {
      expect(SAT.makeRequest() instanceof Promise).to.be.true;
    });

    it("should invoke createSatRequest as its executor", function () {
      var createSatRequestStub = sandbox.stub(SAT, 'createSatRequest');

      SAT.makeRequest();

      expect(createSatRequestStub).to.be.called;
    });
  });

  describe("createSatRequest", function () {
    var mockRequest = null;

    beforeEach(function () {
      mockRequest = {
        on: (str, cb)=> { return true; },
        end: ()=> { return true; }
      };
      httpsStub.returns(mockRequest);
    });

    it("should set class props for resolve and reject", function () {
      var testResolve = function () { var testResolve = true; };
      var testReject  = function () { var testReject  = true; };

      SAT.createSatRequest(testResolve, testReject);

      expect(SAT.satRequestResolve).to.equal(testResolve);
      expect(SAT.satRequestReject).to.equal(testReject);
    });

    it("should invoke https.get with the class url and response handler", function () {
      var mockUrl = 'www.testurl.com';

      SAT.url = mockUrl;

      SAT.createSatRequest();

      expect(httpsStub).to.be.called;
      expect(httpsStub.args[0][0]).to.equal(mockUrl);
      expect(httpsStub.args[0][1]).to.be.a('function'); // Again with the bound functions...
    });

    it("should set a listener on error, and invoke end", function () {
      var requestOnSpy = sandbox.spy(mockRequest, 'on');
      var requestEndSpy = sandbox.spy(mockRequest, 'end');

      SAT.createSatRequest();

      expect(requestOnSpy).to.be.called;
      expect(requestOnSpy.args[0][0]).to.equal('error');
      expect(requestOnSpy.args[0][1]).to.be.a('function');

      expect(requestEndSpy).to.be.called;
    });
  });

  describe("handleSatResponse", function () {
    var mockResponse = null;
    var expectedListeners = null;
    var responseOnSpy = null;

    beforeEach(function () {
      mockResponse = {
        on: function (str, cb) {
          this[str] = cb;
        }
      };

      expectedListeners = ['data', 'end', 'error'];

      responseOnSpy = sandbox.spy(mockResponse, 'on');
    });

    it("should set listeners", function () {
      SAT.handleSatResponse(mockResponse);

      for (let l=0; l<expectedListeners.length; l++) {
        expect(responseOnSpy.args[l][0]).to.equal(expectedListeners[l]);
        expect(responseOnSpy.args[l][1]).to.be.a('function');
      }
    });

    it("should resolve class Promise on 'end'", function () {
      var resolveSpy;

      SAT.satRequestResolve = function () { return true; };

      resolveSpy = sandbox.spy(SAT, 'satRequestResolve');

      SAT.handleSatResponse(mockResponse);
      mockResponse.end();

      expect(resolveSpy).to.be.called;
    });

    it("should reject class Promise on 'error'", function () {
      var rejectSpy;

      SAT.satRequestReject = function () { return true; };

      rejectSpy = sandbox.spy(SAT, 'satRequestReject');

      SAT.handleSatResponse(mockResponse);
      mockResponse.error();

      expect(rejectSpy).to.be.called;
    });
  });
});
