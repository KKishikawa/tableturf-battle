/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpackPackPwaManifest = require('webpack-pwa-manifest');
const CopyPlugin = require('copy-webpack-plugin');

const srcDir = path.resolve(__dirname, "src");

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: srcDir + '/index.ts',
  mode: 'development',
  devtool: 'source-map',
  optimization: {
    usedExports: true
  },
  output: {
    publicPath : "",
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      "@": srcDir
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // disable type checker - we will use it in fork plugin
            transpileOnly: true
          }
        }
      },
      {
        test: /\.template\.(html|svg)$/,
        use: [{
          loader: "html-loader",
        }],
      },
      {
        test: /\.p?css$/,
        use: [
          process.env.NODE_ENV !== 'production'
            ? 'style-loader'
            : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ]
      },
      {
        test: /\.(?<!template\.)(svg|png|jpe?g)$/,
        type: "asset/resource",
      }
    ]
  },
  plugins: [
    new webpackPackPwaManifest({
      short_name: "ナワバトビルド",
      name: "非公式 ナワバトラーデッキビルダー",
      display: "standalone",
      start_url: ".",
      theme_color: "#6e68d8",
      icons: [{
        src: srcDir + "/assets/img/icon-192.png",
        sizes: "192x192",
      }, {
        src: srcDir + "/assets/img/icon-512.png",
        sizes: "512x512",
      }],
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].css'
    }),
    new HtmlWebpackPlugin({
      template: srcDir + '/index.html',
      favicon: srcDir + "/assets/favicon.ico"
    }),
    new ForkTsCheckerWebpackPlugin(),
    new CopyPlugin({
      // copy static to dist folder
      patterns: [{ from: './static', to: '.' }]
    }),
  ]
};
