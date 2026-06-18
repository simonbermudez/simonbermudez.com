'use strict';

var gulp = require('gulp');
var minify = require('gulp-htmlmin');
var notify = require('gulp-notify');

var pkg = require('../utils/pkg');
var noop = require('../utils/noop');

var sources = [
  './app/src/**/*.html',
  '!./app/src/{vendor,vendor/**}'
];

function buildHtml () {
  return gulp.src(sources)
    .pipe(pkg.debug ? noop() : minify({
      collapseWhitespace: true,
      removeComments: true,
      minifyJS: true,
      minifyCSS: true,
      keepClosingSlash: true
    }))
    .pipe(gulp.dest('./'))
    .pipe(notify({ title: 'Html', message: 'Success', sound: 'Morse' }));
}

gulp.task('html', function () {
  if (pkg.watch) {
    gulp.watch(sources, function rebuildHtml () {
      return buildHtml();
    });
  }

  return buildHtml();
});
