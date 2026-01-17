const path = require('path');
const pathToPhaser = path.join(__dirname, '/node_modules/phaser/');
const phaser = path.join(pathToPhaser, 'dist/phaser.js');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/tetris/game.ts',
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: 'bundle.js',
            publicPath: '/build/'
        },
        devServer: {
            static: {
                directory: path.resolve(__dirname, './'),
            },
            host: '127.0.0.1',
            port: 8080,
            devMiddleware: {
                publicPath: '/build/'
            }
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                phaser: phaser
            }
        },
        devtool: isProduction ? 'source-map' : 'inline-source-map',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /phaser\.js$/,
                    loader: 'expose-loader',
                    options: {
                        exposes: {
                            globalName: 'Phaser',
                            override: true
                        }
                    }
                }
            ]
        }
    };
};
