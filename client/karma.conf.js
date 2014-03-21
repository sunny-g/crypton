module.exports = function(config) {
  config.set({
    port: 9876,

    runnerPort: 9100,

    captureTimeout: 60000,

    basePath: '',

    colors: true,

    autoWatch: true,

    singleRun: false,

    logLevel: config.LOG_WARN,

    exclude: [],

    frameworks: [
      'mocha'
    ],

    plugins: [
      'karma-mocha',
      'karma-spec-reporter',
      'karma-phantomjs-launcher'
    ],

    reporters: [
      'spec'
    ],

    files:[
      'dist/crypton.js',
      'test/vendor/chai.js',
      'test/*.js'
    ],

    browsers: [
      'Chrome',
      'Safari',
      'Firefox',
      'Opera'
    ],
  });
};
