'use strict';

var gulp = require('gulp');
var log = require('fancy-log');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var notify = require('gulp-notify');
var watchify = require('watchify');
var browserify = require('browserify');
var uglify = require('gulp-uglify');

var pkg = require('../utils/pkg');
var noop = require('../utils/noop');
var splitPath = require('../utils/splitPath');

function scripts (entry, output, message) {
  message = message || 'Scripts';

  var outputDetails = splitPath(output);

  var bundler = pkg.watch
    ? watchify(browserify(entry, { debug: pkg.debug, cache: {}, packageCache: {} }))
    : browserify({ entries: [entry] });

  bundler.on('update', bundle);

  function bundle() {
    return bundler.bundle()
      .on('error', function (error) {
        log.error('Browserify error', error);
        process.stdout.write('\x07');
        notify({ title: message, message: 'Error', sound: 'Basso' });
        this.end();
      })
      .pipe(source(outputDetails.file))
      .pipe(pkg.debug ? noop() : buffer())
      .pipe(pkg.debug ? noop() : uglify())
      .pipe(gulp.dest(outputDetails.path))
      .pipe(notify({ title: message, message: 'Success', sound: 'Morse' }));
  }

  return bundle();
}

gulp.task('scripts:3D', function () {
  return scripts(
    './app/src/js/main3D.js',
    './app/dist/js/3D/main.js',
    'Scripts 3D'
  );
});

gulp.task('scripts:2D', function () {
  return scripts(
    './app/src/js/main2D.js',
    './app/dist/js/2D/main.js',
    'Scripts 2D'
  );
});

gulp.task('scripts', gulp.parallel('scripts:2D', 'scripts:3D'));
