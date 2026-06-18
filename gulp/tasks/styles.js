'use strict';

var gulp = require('gulp');
var log = require('fancy-log');
var less = require('gulp-less');
var minify = require('gulp-clean-css');
var rename = require('gulp-rename');
var notify = require('gulp-notify');

var pkg = require('../utils/pkg');
var noop = require('../utils/noop');
var splitPath = require('../utils/splitPath');

function styles (input, output, message) {
  message = message || 'Styles';

  var outputDetails = splitPath(output);

  function build () {
    return gulp.src(input)
      .pipe(less({ javascriptEnabled: true }).on('error', function (error) {
        log.error('Less error', error);
        process.stdout.write('\x07');
        notify({ title: message, message: 'Error', sound: 'Basso' });
        this.end();
      }))
      .pipe(pkg.debug ? noop() : minify())
      .pipe(rename(outputDetails.file))
      .pipe(gulp.dest(outputDetails.path))
      .pipe(notify({ title: message, message: 'Success', sound: 'Morse' }));
  }

  if (pkg.watch) {
    gulp.watch('./app/src/less/**/*.less', build);
  }

  return build();
}

gulp.task('styles:3D', function () {
  return styles(
    './app/src/less/main3D.less',
    './app/dist/css/3D/main.css',
    'Styles 3D'
  );
});

gulp.task('styles:2D', function () {
  return styles(
    './app/src/less/main2D.less',
    './app/dist/css/2D/main.css',
    'Styles 2D'
  );
});

gulp.task('styles', gulp.parallel('styles:2D', 'styles:3D'));
