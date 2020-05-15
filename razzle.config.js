const webRazzlePlugin = require('./plugin/webRazzle');

module.exports = {
  plugins: [
    {
      name: 'web plugin',
      func: webRazzlePlugin,
    },
  ],
};
