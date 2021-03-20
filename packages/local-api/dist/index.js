"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = void 0;
var express_1 = __importDefault(require("express"));
var http_proxy_middleware_1 = require("http-proxy-middleware");
var path_1 = __importDefault(require("path"));
var cells_1 = require("./routes/cells");
var serve = function (port, filename, dir, useProxy) {
    // console.log('serving traffic on port', port);
    // console.log('saving/fetching cells from', filename);
    // console.log('that file is in dir', dir);
    var app = express_1.default();
    app.use(cells_1.createCellsRouter(filename, dir));
    if (useProxy) {
        app.use(http_proxy_middleware_1.createProxyMiddleware({
            target: 'http://localhost:3000',
            ws: true,
            logLevel: 'silent' //turn off all logs of incoming requests
        }));
    }
    else {
        // Applies Node's path resolution algorithm to
        // figure out the absolute path to index.html file
        // local-client/build/.. is inside of node_modules folder
        var packagePath = require.resolve('local-client/build/index.html');
        // path.dirname() will give us everything up to build folder
        // excluding the index.html file
        app.use(express_1.default.static(path_1.default.dirname(packagePath)));
    }
    return new Promise(function (resolve, reject) {
        app.listen(port, resolve).on('error', reject);
    });
};
exports.serve = serve;
