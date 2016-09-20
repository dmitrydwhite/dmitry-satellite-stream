'use strict';

// Require dependencies
var https = require('https');

/**
 * A class to establish connectivity with api.wheretheiss.at
 */
class SatLoc {
  /**
   * Creates a new instance of SatLoc
   * @param  {[String]} satID   [description]
   */
  constructor(satID) {
    this.id = satID;
    this.url = 'https://api.wheretheiss.at/v1/satellites/' + this.id;
  }

  /**
   * Make the https request to the endpoint.  Compose the response.  Resolve the Promise on End Transmission.
   * @return {Promise} Promise object that resolves on end of https get, rejects on error.
   */
  makeRequest() {
    return new Promise( (resolve, reject) => {
      var satRequest = https.get(this.url, (resp) => {
        var completeResponse = '';

        resp.on('data', (chunk) => {
          completeResponse += chunk.toString();
        });

        resp.on('end', () => {
          resolve(completeResponse);
        });

        resp.on('error', (e) => {
          reject(e);
        });
      });
    });
  }
}

module.exports = SatLoc;