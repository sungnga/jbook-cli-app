import * as esbuild from 'esbuild-wasm';
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { unpkgPathPlugin } from './plugins/unpkg-path-plugin';
import { fetchPlugin } from './plugins/fetch-plugin';

function App() {
	const ref = useRef<any>();
	const [input, setInput] = useState('');
	const [code, setCode] = useState('');

	// Initialize esbuild
	// service is what we will use to transpile and bundle our code
	async function startService() {
		ref.current = await esbuild.startService({
			worker: true,
			wasmURL: '/esbuild.wasm'
		});
		// console.log(service);
	}

	useEffect(() => {
		startService();
	}, []);

	async function onClick() {
		if (!ref.current) return;
		// console.log(ref.current);

		// // Transpiling code
		// const result = await ref.current.transform(input, {
		// 	loader: 'jsx',
		// 	target: 'es2015'
		// });
		// setCode(result.code);

		// Bundling code
		const result = await ref.current.build({
			entryPoints: ['index.js'],
			bundle: true,
			write: false,
			plugins: [unpkgPathPlugin(), fetchPlugin(input)],
			define: {
				'process.env.NODE_ENV': '"production"',
				global: 'window'
			}
		});

		// console.log(result);
		setCode(result.outputFiles[0].text);
	}

	return (
		<div>
			<textarea
				value={input}
				onChange={(e) => setInput(e.target.value)}
			></textarea>
			<div>
				<button onClick={onClick}>Submit</button>
			</div>
			<pre>{code}</pre>
		</div>
	);
}

ReactDOM.render(<App />, document.querySelector('#root'));
