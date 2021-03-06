## Dmitry Satellite Stream

A Node Module that creates a readable stream to track the location of satellites... currently limited to the ISS, but that is still pretty cool.

#### Caveat
I decided to use some of the ES6 syntax that I am learning in my own time on this project as well; the upshot is that this module wants Node v4 or better.  NPM will give you a friendly reminder if you `npm install` this with a lower version of Node.

#### Implementation

To download:

```
$ npm install dmitry-satellite-stream
```

To use in a project:

```
var IssStream = require('dmitry-satellite-stream');
// Or
import IssStream from 'dmitry-satellite-stream';

...

// To instantiate
var mySatelliteStream = new IssStream('25544', 1000);

// To receive data, set a listener or pipe to a writeable stream 
// as you would for any Readable stream.
mySatelliteStream.on('data', (dat)=>{
  console.log(typeof dat); // 'object'
});

var anyWriteStream = fs.createWriteStream('foo.txt');

mySatelliteStream.pipe(anyWriteStream);

```

#### API

##### constructor(\<satellite ID\>, \<interval\>, \[options\])
```
/** @example */
const IssStream = require('dmitry-sateillite-stream');

var myIssStream = new IssStream('25544', 1000, { calculateChange: true });
```

##### parameters

|parameter|type|description|
|---|---|---|
|satellite ID|String|The NORAD catalog id of the satellite you want to stream data for.  Default is "25544", the International Space Station.|
|interval|Number|The time in milliseconds to wait to get new data from the service.  Minimum and default are 1000.|
|options (optional)|Object|A map of flags that can alter the data the stream provides|

##### options

Currently, only one option is supported.

|option name|type|description|
|---|---|---|
|`calculateChange`|Boolean|If true, the stream data will also contain the change per second in latitude and longitude of the satellite's position.|

options can be set after instantiation using the method `setOptions`;

```
/** @example */
const IssStream = require('dmitry-satellite-stream');

var myIssStream = new IssStream('25544', 1000);

myIssStream.setOptions({calculateChange: true});
```


#### Build Info
[![Build Status](https://travis-ci.org/dmitrydwhite/dmitry-satellite-stream.svg?branch=master)](https://travis-ci.org/dmitrydwhite/dmitry-satellite-stream)

#### Code Coverage
[![Coverage Status](https://coveralls.io/repos/github/dmitrydwhite/dmitry-satellite-stream/badge.svg?branch=master)](https://coveralls.io/github/dmitrydwhite/dmitry-satellite-stream?branch=master)