'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');

var pkg = require('../utils/pkg');
var noop = require('../utils/noop');
var splitPath = require('../utils/splitPath');

function vendor (dependencies, output, message) {
  message = message || 'Vendor';

  var outputDetails = splitPath(output);

  var paths = [];

  for (var name in pkg.vendor) {
    if (pkg.vendor.hasOwnProperty(name)) {
      if (dependencies.indexOf(name) !== -1) {
        var path = pkg.vendor[name];
        paths.push(path);
      }
    }
  }

  return gulp.src(paths)
    .pipe(concat(outputDetails.file))
    .pipe(pkg.debug ? noop() : uglify())
    .pipe(gulp.dest(outputDetails.path))
    .pipe(notify({ title: message, message: 'Success', sound: 'Morse' }));
}

gulp.task('vendor:3D', function () {
  return vendor(
    [
      'jquery',
      'three',
      'tweenlite',
      'tweenlite.jquery',
      'howler',
      'visibly'
    ],
    './app/dist/js/3D/vendor.js',
    'Vendor 3D'
  );
});

gulp.task('vendor:2D', function () {
  return vendor(
    [
      'jquery',
      'tweenlite',
      'tweenlite.jquery',
      'skrollr'
    ],
    './app/dist/js/2D/vendor.js',
    'Vendor 2D'
  );
});

gulp.task('vendor', gulp.parallel('vendor:2D', 'vendor:3D'));
