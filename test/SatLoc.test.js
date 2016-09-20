'use strict';

/**
 * Unit tests for SatLoc.js
 */
const expect = require('chai').expect;
const sinon = require('sinon');

describe("SatLoc", function () {
  const sat = require('../lib/SatLoc');
  var SAT = null;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
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

  
});