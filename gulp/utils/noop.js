'use strict';

var PassThrough = require('stream').PassThrough;

/**
 * Object-mode pass-through stream.
 *
 * Drop-in replacement for the old `gutil.noop()` used to conditionally
 * skip a step in a gulp pipeline (e.g. uglify/minify while in debug mode).
 *
 * @method noop
 * @return {PassThrough}
 */
function noop () {
  return new PassThrough({ objectMode: true });
}

module.exports = noop;
