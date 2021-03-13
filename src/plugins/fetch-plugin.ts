import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localForage from 'localforage';

const fileCache = localForage.createInstance({
	name: 'filecache'
});

export const fetchPlugin = (inputCode: string) => {
	return {
		name: 'fetch-plugin',
		setup(build: esbuild.PluginBuild) {
			// Handle loading index.js file
			build.onLoad({ filter: /(^index\.js$)/ }, () => {
				return {
					loader: 'jsx',
					contents: inputCode
				};
			});

			// Handle loading CSS files
			// The args is an object contains the path and namespace properties
			build.onLoad({ filter: /.css$/ }, async (args: any) => {
				// Check to see if we have already fetched this file
				// and if it is in the cache
				const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
					args.path
				);

				// If it is, return it immediately
				if (cachedResult) return cachedResult;

				const { data, request } = await axios.get(args.path);
				// Escaped CSS string that can be safely inserted into JS snippet
				// Collapse all the newline characters into a single line
				// Find all the double quotes and escape them
				// Find all the single quotes and escape them
				const escaped = data
					.replace(/\n/g, '')
					.replace(/"/g, '\\"')
					.replace(/'/g, "\\'");
				const contents = `
            const style = document.createElement('style');
            style.innerText = '${escaped}';
            document.head.appendChild(style);
          `;

				const result: esbuild.OnLoadResult = {
					loader: 'jsx',
					contents,
					resolveDir: new URL('./', request.responseURL).pathname
				};

				// Store response in cache
				await fileCache.setItem(args.path, result);

				return result;
			});

			// Handle any arbitrary files
			build.onLoad({ filter: /.*/ }, async (args: any) => {
				// Check to see if we have already fetched this file
				// and if it is in the cache
				const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
					args.path
				);

				// If it is, return it immediately
				if (cachedResult) return cachedResult;

				const { data, request } = await axios.get(args.path);

				const result: esbuild.OnLoadResult = {
					loader: 'jsx',
					contents: data,
					resolveDir: new URL('./', request.responseURL).pathname
				};

				// Store response in cache
				await fileCache.setItem(args.path, result);

				return result;
			});
		}
	};
};
