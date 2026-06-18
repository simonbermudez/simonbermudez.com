'use strict';

var gulp = require('gulp');

// The task files are required alphabetically, so this file loads before the
// tasks it references are registered. Composing inside the task function
// defers name resolution until run time, by which point every task exists.

gulp.task('build', function (done) {
  gulp.parallel('html', 'vendor', 'scripts', 'styles')(done);
});

gulp.task('build:3D', function (done) {
  gulp.parallel('html', 'vendor:3D', 'scripts:3D', 'styles:3D')(done);
});

gulp.task('build:2D', function (done) {
  gulp.parallel('html', 'vendor:2D', 'scripts:2D', 'styles:2D')(done);
});
