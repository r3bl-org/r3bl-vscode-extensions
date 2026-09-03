// Copyright (c) 2026 R3BL LLC. Licensed under MIT License.

//@ts-check

"use strict"

const path = require("path")

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: "node",
    mode: "none",
    entry: "./src/extension.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
    },
    externals: {
        vscode: "commonjs vscode",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/, /\.test\.ts$/],
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            compilerOptions: {
                                noEmit: false,
                            },
                        },
                    },
                ],
            },
        ],
    },
    devtool: "nosources-source-map",
    infrastructureLogging: {
        level: "log",
    },
}
module.exports = [extensionConfig]
