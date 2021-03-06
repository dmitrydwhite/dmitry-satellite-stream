'use strict';

// Require dependencies
const stream = require('stream');
const SatGetter = require('./SatLoc.js');

/**
 * A container for static class properties of IssLocationStream
 */
class ilsDefaults {
  /**
   * Retrieve the static props for the IssLocationStream. Add or modify static props in the returned object.
   * @return {Object} An object with constants for the IssLocationStream
   */
  static getProps() {
    return {
      validSatIds: ['25544'],
      DEFAULT_SAT_ID: '25544',
      DEFAULT_INTERVAL: 1000,
      INTERVAL_MIN: 500,
      supportedOpts: ['calculateChange'],
      SERVICE_ERROR_MESSAGE: 'Received an HTTP status NOT OK from the data source',
      REQUEST_ERROR_MESSAGE: 'Error createing an HTTPS connection'
    }
  }
}

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
    var args = Array.prototype.slice.call(arguments);

    // Call super.
    super({ objectMode: true });
    
    // If we get 0 args, we'll revert to defaults; we can handle 2 or more; but 1 is rly confusing.
    if (args.length === 1) {
      // Unless it's an array, then we will be like, OK.
      if (!args instanceof Array) {
        return this.argsUnclear();
      } else {
        opts = id[2];
        interval = id[1];
        id = id[0];        
      }
    }

    // Class level properties
    this.props = ilsDefaults.getProps();

    // Set the key properties for this class.
    this.satellite = this.getSatId(id);
    this.interval = interval && interval >= this.props.INTERVAL_MIN ? interval : this.props.DEFAULT_INTERVAL;

    this.opts = this.setOptions(opts);
    
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
    var desiredIdx = this.props.validSatIds.indexOf(id);

    return this.props.validSatIds[desiredIdx] || this.props.DEFAULT_SAT_ID;
  }

  /**
   * [setOptions description]
   * @param  {Object} opts An object with indicators to turn on or off supported class options.
   * @return {Object}      An object describing which supported class options have been turned on (true) or off (false).
   */
  setOptions(opts) {
    var ret = {};

    for (let flag in opts) {
      if (this.props.supportedOpts.indexOf(flag) !== -1) {
        ret[flag] = !!opts[flag];
      }
    }

    return ret;
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
      this.timer = this.makeTimeout( this.getDataFromSource.bind(this), this.adjustForLag() );
    }
  }

  /**
   * Option handler for calculateChange. Calculates the deltas per second in latitude and longitude,
   * augments the response received from the service with those values.
   * @param  {Object} response The current data object.
   * @return {Object}          Augmented data object, with props latitudeDeltaPerSecond and longitudeDeltaPerSecond, if appropriate.
   */
  calculateChange(response) {
    // If this is an error, just give it back as-is.
    if (response.error || response.errno || response.status) { return response; }

    // Let's calculate if we have something remembered to compare this current data to.
    if (this.previousObj) {
      // Time is given to us by the service in whole seconds.
      let time = response.timestamp - this.previousObj.timestamp;
      // Longitude is fairly simple to calculate.
      let lonDiff = Math.abs(response.longitude - this.previousObj.longitude);
      // Latitude is somewhat more complex.
      let latDiff;

      // If the last latitude and the current are both positive or negative, it is a fairly simple calculation.
      if ( (response.latitude > 0 && this.previousObj.latitude > 0) ||
           (response.latitude < 0 && this.previousObj.latitude < 0) ) {
         latDiff = Math.abs(response.latitude - this.previousObj.latitude);
      } else {
      // But if we have to determine if the satellite is crossing 0 or 180, it gets a little trickier.
        
        // We'll calculate the path across 180degrees...
        let transverseDiff = (180 - Math.abs(response.latitude)) + (180 - Math.abs(this.previousObj.latitude));
        // ... and if that's the shortest path, we will use it; otherwise use the absolute difference.
        latDiff = transverseDiff < 180 ? transverseDiff : Math.abs(response.latitude - this.previousObj.latitude);
      }

      // Divide for deltas and augment the response. Don't divide by 0. (If no time has passed, then we can assume the satellite is in the same place.)
      response.latitudeDeltaPerSecond = time !== 0 ? (latDiff / time) : 0
      response.longitudeDeltaPerSecond = time !== 0 ? (lonDiff / time) : 0;
    }

    // Whether this is the first response or the augmented one, set it as the previousObj and return it.
    this.previousObj = response;
    return response;
  }

  /**
   * Convert an error that may have been received from a parent class or data source into a common pattern.
   * @param  {Object} obj An object that may or many not have a few anticipated indicators of being an error.
   * @return {Object}     Unchanged if no error detected, otherwise a new object in a more common pattern.
   */
  handleError(obj) {
    if (obj.errno || obj.status) {
      let ret = {};

      ret.error = obj.errno || obj.status || 'error';
      ret.message = obj.code || obj.description || obj.error || 'no message provided';
      ret.detail = obj.status ? 
        this.props.SERVICE_ERROR_MESSAGE :
        this.props.REQUEST_ERROR_MESSAGE;

      return ret;
    } else {
      return obj;
    }
  }

  /**
   * Return an error object indicating that one argument is confusing for us when trying to instantiate this class.
   * @return {Object} Error object stating that you are confusing this class.
   */
  argsUnclear() {
    return {
      error: "One Argument",
      message: "Only passing one argument is unclear; check arguments."
    };
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
        try {
          var respObj = JSON.parse(resp);

          respObj = this.handleError(respObj);
          if (this.opts.calculateChange) { respObj = this.calculateChange(respObj); }
          this.resps += 1;
          this.lag = (Date.now() - this.startReq);
          this.push(respObj);
        } catch (e) {
          this.push('Error in IssLocationStream.getDataFromSource: ' + e);
        }
      })
      .catch(err=> {
        this.push(this.handleError(err));
      })

  }
}

module.exports = IssLocationStream;
