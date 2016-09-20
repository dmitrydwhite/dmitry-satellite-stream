'use strict';

// Require dependencies
const stream = require('stream');
const SatGetter = require('./SatLoc.js');

/**
 * A stream wrapper around the getter for the location of the ISS
 * @extends {stream.Readable}
 */
class IssLocationStream extends stream.Readable {
  /**
   * Creates an instance of IssLocationStream.
   * @param  {[String]} id       The string identifier of the satellite whose location you wish to track. Defaults to '25544'. Optional.
   * @param  {[Number]} interval The interval between updates in milliseconds. Defaults to 1000. Optional.
   * @param  {[Object]} opts     Optional set of parameters for instantiating the class.
   */
  constructor(id, interval, opts) {
    // Call super.
    super({ objectMode: true });

    // Class level properties for making sure a valid satellite ID is set.
    this.validSatIds = ['25544'];
    this.DEFAULT_SAT_ID = '25544';

    // Set the key properties for this class.
    this.satellite = this.getSatId(id);
    this.interval = interval && interval >= 10 ? interval : 1000;

    // Class level property for supported options
    this.supportedOpts = [];
    this.opts = this.getOptions(opts);
    
    // Instantiate the satellite data requestor.
    this.dataSource = new SatGetter(this.satellite);
    
    this.lag = 0;
    this.reqs = 0;
    this.resps = 0;
  }

  /**
   * If the passed satellite ID is in the list of valid IDs, set it to that; otherwise set it to the default.
   * @param  {String} id The id of the desired satellite to track
   * @return {String}    A valid satellite id
   */
  getSatId(id) {
    var desiredIdx = this.validSatIds.indexOf(id);

    return this.validSatIds[desiredIdx] || this.DEFAULT_SAT_ID;
  }

  getOptions(opts) {
    return true;
  }

  /**
   * Wrapper for setTimeout
   * @param  {Function} cb       Callback to pass to setTimeout.
   * @param  {Number}   interval Delay in milliseconds.
   * @return {Number}            Timeout ID.
   */
  makeTimeout(cb, interval) {
    return setTimeout(cb, interval);
  }

  /**
   * Wrapper for clearTimeout
   * @param  {Number} timeout Timeout ID.
   */
  unmakeTimeout(timeout) {
    clearTimeout(timeout);
  }

  /**
   * Modifies the timeout interval based on how long the http request took.
   * @return {Number} The difference between the user's desired interval and the http request lag.
   */
  adjustForLag() {
    return Math.max(this.interval - this.lag, 0)
  }

  /**
   * Clears any timeouts set before pausing stream.
   * @extends {stream.Readable.pause}
   */
  pause() {
    if (this.timer) { this.unmakeTimeout(this.timer); }

    return super.pause();
  }

  /**
   * Retrieves data by intervals if stream is not paused.
   * @param  {[Number]} size Optional argument to specify how much data to read.
   */
  _read(size) {
    if (!this.isPaused()) {
      this.timer = this.makeTimeout( ()=>{ this.getDataFromSource() }, this.adjustForLag() );
    }
  }

  /**
   * Retrieves the data from the satellite source.
   * @return {Promise} A promise from the data source. Returning this primarily for testing purposes.
   */
  getDataFromSource() {
    this.reqs += 1;
    this.startReq = Date.now();
    
    return this.dataSource.makeRequest()
      .then(resp=> {
        var respObj = JSON.parse(resp);

        this.resps += 1;
        this.lag = (Date.now() - this.startReq);
        this.push(respObj);
      })
      .catch(err=> {
        this.push('ERR0R: ' + err + ' ]X[ ' + err.error);
      })

  }
}

module.exports = IssLocationStream;

var merps = new IssLocationStream('25544', 1000);

merps.on('data', function (theThing) {
  console.log(theThing.daynum);
});

setTimeout(function () {
  merps.pause();
}, 15000)