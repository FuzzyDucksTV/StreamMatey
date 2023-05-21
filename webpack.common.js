// webpack.prod.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production'
});
// webpack.dev.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development'
});
// webpack.common.js
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  entry: {
    background: path.join(__dirname, 'background.js'),
    options: path.join(__dirname, 'options.js'),
    twitchChatHandler: path.join(__dirname, 'twitchChatHandler.js'),
    contentScript: path.join(__dirname, 'contentScript.js'),
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

        test: /\.html$/i,
        loader: 'html-loader',
        options: {
          attributes: {
            list: [
              {
                tag: 'img',
                attribute: 'src',
                type: 'src',
              },
              {
                tag: 'link',
                attribute: 'href',
                type: 'src',
              },
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        // Apply rule for images
        test: /\.(png|jpe?g|gif|svg)$/,
        use: [
          {
            // Using file-loader for these files
            loader: 'file-loader',  
            // In options we can set different things like format
            // and directory to save
            options: {
              outputPath: 'build\icons'
            }
        }
      ]
  }],
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src\manifest.json', to: 'build/manifest.json' },
        { from: 'src\options.js', to: 'build/options.js' },
        { from: 'src\icons', to: 'build\icons' },
        { from: 'src\icon.png', to: 'build/icon.png' },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new HtmlWebpackPlugin({
      template: './src/options.html',
      filename: 'options.html',
      chunks: ['options']
    }),
    new HtmlWebpackPlugin({
      template: './src/sentiment.html',
      filename: 'sentiment.html',
      chunks: ['sentiment']
    })
  ]
},
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: 9000
  }
};


              
