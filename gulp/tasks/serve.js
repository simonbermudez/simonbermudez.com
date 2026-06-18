'use strict';

var gulp = require('gulp');
var connect = require('gulp-connect');

gulp.task('serve', function (done) {
  connect.server({
    root: './',
    port: 8000,
    host: '0.0.0.0'
  });

  done();
});
