/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');

const srcDir = path.resolve(__dirname, "src");

module.exports = merge(common, {
  mode: 'production',
  devtool: false,
  plugins: [
    new InjectManifest({
      swSrc: srcDir + "/service-worker/src-sw.js",
      swDest: "sw.js",
    }),
    new CleanWebpackPlugin(),
  ]
});
