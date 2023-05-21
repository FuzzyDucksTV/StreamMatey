const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    background: './src/background.js',
    options: './src/options.js',
    twitchChatHandler: './src/twitchChatHandler.js',
    contentScript: './src/contentScript.js',
    netlifyFunctions: './src/netlifyFunctions.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/manifest.json', to: 'manifest.json' },
        { from: './src/options.html', to: 'options.html' },
        { from: './src/sentiment.html', to: 'sentiment.html' },
        { from: './src/dark.css', to: 'dark.css' },
        { from: './src/light.css', to: 'light.css' },
        { from: './src/icons', to: 'icons' },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
  ]
};
