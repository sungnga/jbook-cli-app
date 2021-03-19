import { Command } from 'commander';
import { serve } from 'local-api';
import path from 'path';

// square brackets indicate optional value
// angle brackets indicate a required value
export const serveCommand = new Command()
	.command('serve [filename]')
	.description('Open a file for editing')
	.option('-p, --port <number>', 'port to run server on', '4050')
	.action((filename = 'notebook.js', options: { port: string }) => {
		const dir = path.join(process.cwd(), path.dirname(filename));
		serve(parseInt(options.port), path.basename(filename), dir);
	});
