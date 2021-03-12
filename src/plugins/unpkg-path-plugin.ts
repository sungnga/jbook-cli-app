import * as esbuild from 'esbuild-wasm';
import axios from 'axios';

export const unpkgPathPlugin = () => {
	return {
		name: 'unpkg-path-plugin',
		setup(build: esbuild.PluginBuild) {
			// The args is an object contains path, importer, namespace, and resolveDir properties
			build.onResolve({ filter: /.*/ }, async (args: any) => {
				console.log('onResolve', args);
				if (args.path === 'index.js') {
					return { path: args.path, namespace: 'a' };
				}
				// If the next file we're looking for has a relative path
				// Update the URL constructor to include the resolveDir
				// We just want the path in the href property of the url object
				if (args.path.includes('./') || args.path.includes('../')) {
					return {
						namespace: 'a',
						path: new URL(
							args.path,
							'https://unpkg.com' + args.resolveDir + '/'
						).href
					};
				}

				return {
					namespace: 'a',
					path: `https://unpkg.com/${args.path}`
				};
			});

			// The args is an object contains the path and namespace properties
			build.onLoad({ filter: /.*/ }, async (args: any) => {
				console.log('onLoad', args);

				// If we try to fetch a file with a path besides index.js
				// then we make a request with axios to args.path(url)
				// This should give us back the contents of whatever file is at that url
				if (args.path === 'index.js') {
					return {
						loader: 'jsx',
						contents: `
              const message = require('nested-test-pkg');
              console.log(message);
            `
					};
				}

        const { data, request } = await axios.get(args.path);
				// console.log(request);
        // console.log(data)
				// resolveDir is going to be provided to the next file we try to resolve
				// It describes where we found the last file,
				// the file where we first find the main module
				return {
					loader: 'jsx',
					contents: data,
					resolveDir: new URL('./', request.responseURL).pathname
				};
			});
		}
	};
};
