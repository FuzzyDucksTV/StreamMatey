// webpack.common.js
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    background: path.join(__dirname, 'background.js'),
    options: path.join(__dirname, 'options.js'),
    twitchChatHandler: path.join(__dirname, 'twitchChatHandler.js'),
    sentimentAnalysis: path.join(__dirname, 'sentimentAnalysis.js'),
    toxicityDetection: path.join(__dirname, 'toxicityDetection.js'),
    netlifyFunctions: path.join(__dirname, 'netlifyFunctions.js')
  },
  output: {
    path: path.join(__dirname, 'dist'),
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
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ]
};
