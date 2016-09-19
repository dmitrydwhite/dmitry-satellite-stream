'use strict';

var stream = require('stream');
var SatGetter = require('./SatLoc.js');

class IssLocationStream extends stream.Readable {
  constructor(id, interval) {
    super({objectMode: true});
    this.id = id || '25544';
    this.interval = interval || 1000;
    this.dataSource = new SatGetter;
  }

  // TODO: Figure out error handling
  handleEnd() {
    console.log('something seems to have ended');
  }

  _read(size) {
    if (!this.isPaused()) {
      setTimeout( ()=> {
        this.dataSource.makeRequest(this.id)
          .then(resp=> {
            // this.handleRead(resp);
            this.push(resp);
          })
          .catch(err=> {
            console.log(err + ' ' + err.message);
          })
      }, this.interval);
    }
  }
}

module.exports = IssLocationStream;