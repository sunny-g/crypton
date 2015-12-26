var path = require('path');
var webpack = require('webpack');

var src = 'src/';
var vendor = 'src/vendor/';

module.exports = {
  entry: './src/index.js',
  output: {
    path: './dist',
    filename: 'crypton.webpack.node.js',
    //library: 'crypton',
    libraryTarget: 'umd'
  },
  //target: 'node'

  // TODO: QUESTIONS:
  // 1. what is resolve.alias? does it actually insert the require statements for the right var?
  // 2. can we use a script-then-export (or expose) loader for the other vendor files?
  // 3. can we use script-then-export (or expose) loaders for the src/ file? how can we export crypton to every other src/ file
  // 4. do we need to use providePlugin? what should the value of the passed-in object be? will they be resolved by resolve.alias?
  // 5. try this out with webpack-tut repo
/*
  resolve: {
    root: path.resolve(__dirname),
    //extensions: ['.js'],
    //moduleDependencies: ['src/vendor']
    alias: {
      async: vendor + 'async.js',
      bcrypt: vendor + 'bcrypt.js',
      //CircularJSON: path.join(__dirname, vendor, 'circular-json.js'),
      //isomerize
      //jsondiffpatch: path.join(__dirname, vendor, 'jsondiffpatch.min.js)',
      superagent: vendor + 'request.js',
      sjcl: vendor + 'sjcl.js',
      io: vendor + 'socket.io.js',
      //SRPClient: vendor + 'srp-client.js'
    }
  },
 */
  //plugins: [
  //  new webpack.ProvidePlugin({
  //    sjcl: path.join(__dirname, vendor, 'sjcl.js')
  //  })
  //],
/*
  module: {
    loaders: [
      // TODO: use loaders to fix up the other vendor files
      {
        //loader: 'exports?crypton!./dist/crypton.node.js'
        //test: /[\/]async\.js$/, loader: 'exports?async'
      },
      {
        // loader for src/ files
      }
    ]
  },
  externals: {

  },
  //devtool: 'source-map'
  //target: 'web'
 */
};


/*
Approaches:
  1.
    - use webpack to replicate existing functionality (put all src files and vendor files into the same output js)
      - target browser ("web")
      - name this webpack.config.web.js
    - then use this to target node
    - issues:
    - stubbed out Card, qr.js and qrcode.js

  2.


Notes:
  - ignore src/card.js and vendor/qr.js and vendor/qrcode.js as it's only good for the qr codes and displaying canvases of user cards
  - possibly ignore isomer.js as its used for setting up web workers
  - socketio exports `io` var and is used in src/session.js
    - used to:
      - connect to crypton server
      - listen for inbox messages
      - listen for container updates
      - listen for item updates
 */

/*
TODO: non-browser rewrite

terminal tabs for the non-browser rewrite:
  ./compile-withoutcards.sh
 ./node_modules/karma/bin/karma start --browsers PhantomJS karma.conf.rewrite.js

  Notes:
    - rewrite compile.sh to exclude Card and qr libs
    - rewrite parts of the library
    - add `window` or `document` everywhere it's necessary
    - add if blocks or `window.sessionStorage && window.sessionStorage.set...` wherever necessary
    - use compile.sh watcher to continually test the files as you are making explicit the browser API dependencies
 */