import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

export const serve = (port: number, filename: string, dir: string) => {
	// console.log('serving traffic on port', port);
	// console.log('saving/fetching cells from', filename);
	// console.log('that file is in dir', dir);

	const app = express();

	// Applies Node's path resolution algorithm to
	// figure out the absolute path to index.html file
	// local-client/build/.. is inside of node_modules folder
	const packagePath = require.resolve('local-client/build/index.html');
	// path.dirname() will give us everything up to build folder
	// excluding the index.html file
	app.use(express.static(path.dirname(packagePath)));
	app.use(
		createProxyMiddleware({
			target: 'http://localhost:3000',
			ws: true, //enable web socket support. Listen for changes in react app
			logLevel: 'silent' //turn off all logs of incoming requests
		})
	);

	return new Promise<void>((resolve, reject) => {
		app.listen(port, resolve).on('error', reject);
	});
};
