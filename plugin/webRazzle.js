const util = require('util');
const path = require('path');

const dotEnv = require('dotenv-webpack');
const LoadableWebpackPlugin = require('@loadable/webpack-plugin');

const makeLoaderFinder = require('razzle-dev-utils/makeLoaderFinder');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const cwd = process.cwd();

// eslint-disable-next-line
const debug = obj => {
  // eslint-disable-next-line
  console.log(util.inspect(obj, false, null, true));
};

const babelLoaderFinder = makeLoaderFinder('babel-loader');

const defaultOptions = {
  include: [],
};

function modify(baseConfig, env, webpack, userOptions = {}) {
  const { target, dev } = env;
  const options = { ...defaultOptions, ...userOptions };
  const webpackConfig = { ...baseConfig };

  webpackConfig.devtool = 'cheap-eval-source-map';
  webpackConfig.resolve.extensions = [...webpackConfig.resolve.extensions, '.ts', '.tsx'];

  // make it work with babel + typescript
  webpackConfig.module.strictExportPresence = false;

  // Client: ts optimization on development
  if (target === 'web' && dev) {
    // As suggested by Microsoft's Outlook team, these optimizations crank up Webpack x TypeScript perf.
    // https://medium.com/@kenneth_chau/speeding-up-webpack-typescript-incremental-builds-by-7x-3912ba4c1d15
    webpackConfig.output.pathinfo = false;
    webpackConfig.optimization = {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    };
  }

  // Client: chunk strategy on production
  if (target === 'web' && !dev) {
    webpackConfig.output = {
      ...webpackConfig.output,
      filename: 'static/js/[chunkhash].js',
      chunkFilename: 'static/js/chunk-[id]-[chunkhash].js',
      futureEmitAssets: true,
    };
  }

  // Safely locate Babel loader in Razzle's webpack internals
  const babelLoader = webpackConfig.module.rules.find(babelLoaderFinder);
  if (!babelLoader) {
    throw new Error(`'babel-loader' was erased from config, we need it to define typescript options`);
  }

  babelLoader.test = [babelLoader.test, /\.tsx?$/];
  babelLoader.include = [...babelLoader.include, ...options.include];

  babelLoader.use[0].options = {
    babelrc: false,
    cacheDirectory: true,
  };

  // Client: three shaking on production
  if (target === 'web' && !dev) {
    webpackConfig.plugins = [
      new CleanWebpackPlugin(),
      new dotEnv({
        path: path.join(cwd, './env'),
      }),
      ...webpackConfig.plugins,
    ];
  }

  if (target === 'web') {
    webpackConfig.plugins = [
      new dotEnv({
        path: path.join(cwd, './.env'),
      }),
      ...webpackConfig.plugins,
    ];
  }

  if (target === 'web') {
    const filename = path.resolve(cwd, 'build');

    webpackConfig.plugins = [
      ...webpackConfig.plugins,
      new LoadableWebpackPlugin({
        outputAsset: false,
        writeToDisk: { filename },
      }),
    ];

    webpackConfig.output.filename = dev ? 'static/js/[name].js' : 'static/js/[name].[chunkhash:8].js';

    webpackConfig.node = { fs: 'empty' }; // fix "Cannot find module 'fs'" problem.

    webpackConfig.optimization = Object.assign({}, webpackConfig.optimization, {
      runtimeChunk: true,
      splitChunks: {
        chunks: 'all',
        name: dev,
      },
    });
  }
  
  // disable devServer error overlay
  if (webpackConfig.devServer) {
    webpackConfig.devServer.before = () => {};
  }

  return webpackConfig;
}

module.exports = modify;
