import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export const serve = (port: number, filename: string, dir: string) => {
	// console.log('serving traffic on port', port);
	// console.log('saving/fetching cells from', filename);
	// console.log('that file is in dir', dir);

	const app = express();

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
