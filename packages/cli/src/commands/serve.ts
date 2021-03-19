import { Command } from 'commander';

// square brackets indicate optional value
// angle brackets indicate a required value
export const serveCommand = new Command()
	.command('serve [filename]')
  .description('Open a file for editing')
  .option('-p, --port <number>', 'port to run server on', '4050')
	.action((filename = 'notebook.js', options) => {
		console.log(filename, options);
	});
