import * as esbuild from 'esbuild-wasm';
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

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

	function onClick() {
		if (!ref.current) return;

		console.log(ref.current);
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
