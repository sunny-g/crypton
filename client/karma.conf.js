module.exports = function(config) {
  config.set({

    basePath: '',

    frameworks: ["mocha"],
    files:[
      'dist/crypton.js',
      'test/vendor/chai.js',
        'test/*.js'
    ],

    exclude: [],

    reporters: [
      'progress'
    ],

    port: 9876,

    runnerPort: 9100,

    colors: true,

    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_DEBUG,

    autoWatch: true,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      'Chrome',
      'Safari',
      'Firefox',
      'Opera'
    ],

    captureTimeout: 60000,

    singleRun: false
  });
};
