module.exports = {
  inDir: './',
  outDir: 'doc',
  css: 'doc/documentation.css',
  tplEngine: 'jade',
  tplExtension: 'jade',
  markdownEngine: 'showdown',
  onlyUpdated: false,
  colourScheme: 'monokai',
  tolerant: false,
  index: 'README.md.html',
  ignoreHidden: true,
  sidebarState: true,
  exclude: [
    'otis.config.js',
    'doc',
    'server/node_modules',
    'client/node_modules',
    'server/test',
    'client/test',
    'client/dist',
    'client/src/vendor',
    'integration_tests'
  ].join(',')
};
