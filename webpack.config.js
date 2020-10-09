const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
    'mode': 'production',
    'entry': {
        'app_js': ['./src/index.js'],
        'app_css': ['./src/style.js'],
    },
    'plugins': [
        new WebpackNotifierPlugin({
            'title': 'locate',
            'contentImage': path.join(__dirname, 'public/app/icons/icon-256x256.png'),
        }),
        new MiniCssExtractPlugin({
            'filename': '[name].css',
        }),
    ],
    'output': {
        'filename': '[name].js',
        'path': path.resolve(__dirname, 'public'),
    },
    'module': {
        'rules': [
            {
                'test': /\.css$/,
                'use': [
                    {
                        'loader': MiniCssExtractPlugin.loader,
                        'options': {
                            // you can specify a publicPath here
                            // by default it uses publicPath in webpackOptions.output
                            'publicPath': '.',
                            'hmr': process.env.NODE_ENV === 'development', // webpack 4 only
                        },
                    },
                    'css-loader',
                ],
            },
            {
                'test': /\.(png|svg|jpg|gif)$/,
                'use': [
                    'file-loader',
                ],
            },
        ],
    },
};
