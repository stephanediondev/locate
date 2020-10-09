const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    'mode': 'production',
    'entry': {
        'app_js': ['./src/index.js'],
        'app_css': ['./src/style.js'],
    },
    'plugins': [new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        'filename': '[name].css',
    })],
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
