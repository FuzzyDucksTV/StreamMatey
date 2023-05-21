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
              outputPath: 'images'
            
            }
        }
      ] 
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'icons', to: 'build/icons' }, // example of copying directory
        { from: 'manifest.json', to: 'build/manifest.json' },
        { from: 'options.html', to: 'build/options.html' },
        { from: 'sentiment.html', to: 'build/sentiment.html' },
        { from: 'toxicity.html', to: 'build/toxicity.html' },
        { from: 'netlifyFunctions.js', to: 'build/netlifyFunctions.js' },
        
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
  ]
};
