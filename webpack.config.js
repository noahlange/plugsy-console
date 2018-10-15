const { resolve } = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'plugsy-console.js'
  },
  externals: {
    plugsy: 'plugsy'
  },
  plugins: [
    new TerserPlugin({
      terserOptions: {
        mangle: false,
        keep_fnames: true,
        keep_classnames: true,
        output: {
          comments: /^\:/gi
        }
      }
    })
  ],
  target: 'web',
  resolve: {
    extensions: ['.js', '.ts', '.json', '.css']
  },
  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  }
};
