"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveCommand = void 0;
var commander_1 = require("commander");
// square brackets indicate optional value
// angle brackets indicate a required value
exports.serveCommand = new commander_1.Command()
    .command('serve [filename]')
    .description('Open a file for editing')
    .option('-p, --port <number>', 'port to run server on', '4050')
    .action(function (filename, options) {
    if (filename === void 0) { filename = 'notebook.js'; }
    console.log(filename, options);
});
