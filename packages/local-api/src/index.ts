import express from 'express';

export const serve = (port: number, filename: string, dir: string) => {
	// console.log('serving traffic on port', port);
	// console.log('saving/fetching cells from', filename);
	// console.log('that file is in dir', dir);

	const app = express();

	return new Promise<void>((resolve, reject) => {
		app.listen(port, resolve).on('error', reject);
	});
};
