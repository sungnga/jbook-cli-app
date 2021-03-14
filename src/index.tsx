import 'bulmaswatch/superhero/bulmaswatch.min.css';
import * as esbuild from 'esbuild-wasm';
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { unpkgPathPlugin } from './plugins/unpkg-path-plugin';
import { fetchPlugin } from './plugins/fetch-plugin';
import CodeEditor from './components/CodeEditor';
import Preview from './components/Preview';

function App() {
	const ref = useRef<any>();
	const [code, setCode] = useState('');
	const [input, setInput] = useState('');

	// Initialize esbuild
	// service is what we will use to transpile and bundle our code
	async function startService() {
		ref.current = await esbuild.startService({
			worker: true,
			wasmURL: 'https://unpkg.com/esbuild-wasm@0.8.27/esbuild.wasm'
		});
		// console.log(service);
	}

	useEffect(() => {
		startService();
	}, []);

	async function onClick() {
		if (!ref.current) return;
		// console.log(ref.current);

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

		setCode(result.outputFiles[0].text);
	}

	return (
		<div>
			<CodeEditor
				initialValue='const a = 1;'
				onChange={(value) => setInput(value)}
			/>
			<div>
				<button onClick={onClick}>Submit</button>
			</div>
			<Preview code={code} />
		</div>
	);
}

ReactDOM.render(<App />, document.querySelector('#root'));
