'use strict';

// Require dependencies
var https = require('https');

/**
 * A class to establish connectivity with api.wheretheiss.at
 */
class SatLoc {
  /**
   * Creates a new instance of SatLoc
   * @param  {[String]} satID   The NORAD catalog id of the satellite you want to stream data for.
   */
  constructor(satID) {
    this.id = satID;
    this.url = 'https://api.wheretheiss.at/v1/satellites/' + this.id;
  }

  /**
   * Wrap the https request to the endpoint in a Promise.
   * @return {Promise} 
   */
  makeRequest() {
    return new Promise(this.createSatRequest.bind(this));
  }

  /**
   * Wrapper method for https.get; anticipates living its life as a Promise.
   * @param  {Function} resolve Promise success callback
   * @param  {Function} reject  Promise failure callback
   */
  createSatRequest(resolve, reject) {
    var satRequest;

    this.satRequestResolve = resolve;
    this.satRequestReject = reject;

    satRequest = https.get(this.url, this.handleSatResponse.bind(this));

    satRequest.on('error', (e)=> {
      this.satRequestReject(e);
    });

    satRequest.end();
  }

  /**
   * Handler for the response received from the https request to the service. Sets listeners to resolve
   * or reject the class response Promise.
   * @param  {Object} resp Response received
   */
  handleSatResponse(resp) {
    var completeResponse = '';

    resp.on('data', (chunk) => {
      completeResponse += chunk.toString();
    });

    resp.on('end', () => {
      this.satRequestResolve(completeResponse);
    });

    resp.on('error', (e) => {
      this.satRequestReject(e);
    });

  }
}

module.exports = SatLoc;
