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
			// The args is an object contains the path and namespace properties
			build.onLoad({ filter: /.*/ }, async (args: any) => {
				// If we try to fetch a file with a path besides index.js
				// then we make a request with axios to args.path(url)
				// This should give us back the contents of whatever file is at that url
				if (args.path === 'index.js') {
					return {
						loader: 'jsx',
						contents: inputCode
					};
				}

				// Check to see if we have already fetched this file
				// and if it is in the cache
				const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
					args.path
				);

				// If it is, return it immediately
				if (cachedResult) return cachedResult;

				const { data, request } = await axios.get(args.path);
				// resolveDir is going to be provided to the next file we try to resolve
				// It describes where we found the last file,
				// the file where we first find the main module
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
