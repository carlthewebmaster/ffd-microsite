// README: Split this file up if it starts getting too long. ( i.e. 300 lines )
//

// This gulp asset pipeline supports linting of scss and js files along with
// compiling and bundling css and js files into static/assets/ directories to
// be used by Hugo.

var gulp = require('gulp');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var browserify = require('browserify');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var scsslint = require('gulp-scss-lint');
var del = require('del');
var filter = require('gulp-filter');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');
var size = require('gulp-size');
var runSequence = require('run-sequence');
var pkg = require('./package.json');
var sassFiles = filter([ '**/*.scss' ], { restore: true });
var jsFiles = filter([ '**/*.js' ], { restore: true });
var spawn = require('child_process').spawn;

var cFlags = {
  production: false,
  test: true,
};

gulp.task('no-test', function (done) {
  gutil.log('Disabling tests');
  cFlags.test = false;
  done();
});

gulp.task('production', function (done) {
  gutil.log('Enabling production tasks');
  cFlags.production = true;
  done();
});

gulp.task('clean-all', function () {
  return del('./static/assets/**/*');
});

gulp.task('scss-lint', function (done) {

  if (!cFlags.test) {
    gutil.log('scss-lint', 'Disabling linting');
    return done();
  }

  return gulp.src('./assets/styles/**/*.scss')
    .pipe(size())
    .pipe(scsslint());

});

gulp.task('eslint', function (done) {

  if (!cFlags.test) {
    gutil.log('eslint', 'Disabling linting');
    return done();
  }

  return gulp.src('./assets/scripts/**/*.js')
    .pipe(size())
    .pipe(eslint());

});

gulp.task('styles:homepage', [ 'scss-lint' ], function () {

  gutil.log('styles:homepage', 'Compiling Sass assets');

  var sassStream = sass();
  var stream = gulp.src('./assets/styles/homepage.scss')
    .pipe(sassFiles);

  if (cFlags.production) {
    gutil.log('styles', 'Compressing styles');
    sassStream = sass({ outputStyle: 'compressed' });
  }

  stream = stream.pipe(sassStream.on('error', sass.logError))
    .pipe(size())
    .pipe(gulp.dest('./static/assets/styles'));

  return stream;

});

gulp.task('scripts', [ 'eslint' ], function () {

  gutil.log('scripts', 'Browserifying JavaScript assets');

  var bundle = browserify({
    entries: './assets/scripts/start.js',
    debug: true,
  }).bundle();

  bundle = bundle.pipe(source('start.js'))
    .pipe(buffer());

  if (cFlags.production) {
    gutil.log('scripts', 'Compressing scripts');
    bundle = bundle.pipe(uglify());
  }

  bundle = bundle.pipe(rename('main.js'))
    .pipe(size())
    .pipe(gulp.dest('./static/assets/scripts'));

  return bundle;

});

gulp.task('images', function () {
  gutil.log('images', 'Copying image assets');
  return gulp.src([
      './assets/images/**/*',
      './node_modules/uswds/src/img/**/*'
    ])
    .pipe(gulp.dest('./static/assets/images'));
});

gulp.task('fonts', function () {
  gutil.log('fonts', 'Copying font assets');
  return gulp.src([
      './assets/fonts/**/*',
      './node_modules/uswds/src/fonts/**/*'
    ])
    .pipe(gulp.dest('./static/assets/fonts'));
});

gulp.task('build', [ 'clean-all' ], function (done) {
  printPackageInfo();
  gutil.log('build', 'Building asset-pipeline');
  runSequence([ 'styles:homepage', 'scripts', 'images' ], done);
});

gulp.task('watch', function () {
  gutil.log('watch', 'Watching assets for changes');
  gulp.watch('./assets/styles/**/*.scss', [ 'styles:homepage' ]);
  gulp.watch('./assets/scripts/**/*.js', [ 'scripts' ]);
  gulp.watch('./assets/images/**/*', [ 'images' ]);
});

gulp.task('website', [ 'build', 'watch' ], function (done) {

  var buildDrafts = '--buildDrafts';

  if (cFlags.production) {
    buildDrafts = '';
  }

  var hugo = spawn('hugo', [ 'server', buildDrafts ]);

  hugo.stdout.on('data', function (data) {
    gutil.log(gutil.colors.blue('website'), '\n' + data);
  });

  hugo.on('error', done);
  hugo.on('close', done);

});

gulp.task('default', function (done) {
  printPackageInfo();
  gutil.log('Available tasks');
  gutil.log('$', gutil.colors.magenta('gulp watch'));
  gutil.log('Watch for changes and build the asset-pipeline');
  gutil.log('$', gutil.colors.magenta('gulp [ production, no-test ] build'));
  gutil.log('Build the asset-pipeline with optional production and no-test flags');
  gutil.log('$', gutil.colors.magenta('gulp clean-all'));
  gutil.log('Removes files and directories generated by the asset-pipeline');
  gutil.log('$', gutil.colors.magenta('gulp [ production ] website'));
  gutil.log('Runs the gulp watch and hugo serve');
});

function printPackageInfo () {
  gutil.log(
    gutil.colors.yellow('v' + pkg.version),
    gutil.colors.green(pkg.name)
  );
  gutil.log(gutil.colors.red(' ______ ______ _____    '));
  gutil.log(gutil.colors.red('/\\  ___/\\  ___/\\  __-.  '));
  gutil.log(gutil.colors.blue('\\ \\  __\\ \\  __\\ \\ \\/\\ \\ '));
  gutil.log(gutil.colors.blue(' \\ \\_\\  \\ \\_\\  \\ \\____- '));
  gutil.log(gutil.colors.white('  \\/_/   \\/_/   \\/____/ '));
  gutil.log();
}
