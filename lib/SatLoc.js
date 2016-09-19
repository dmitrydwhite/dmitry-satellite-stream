'use strict';

var https = require('https');

/**
 * A class to establish connectivity with api.wheretheiss.at
 */
class SatLoc {
  /**
   * Creates a new instance of SatLoc
   * @param  {[String]} satID   [description]
   * @param  {[Object]} options [description]
   */
  constructor(satID, options) {
    this.id = satID || '25544';
    this.url = 'https://api.wheretheiss.at/v1/satellites/' + this.id;
  }

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
          reject(e.message);
        });
      });
    });
  }
}

// export default SatLoc;
module.exports = SatLoc;