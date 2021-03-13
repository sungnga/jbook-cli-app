import * as esbuild from 'esbuild-wasm';
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { unpkgPathPlugin } from './plugins/unpkg-path-plugin';
import { fetchPlugin } from './plugins/fetch-plugin';

function App() {
	const ref = useRef<any>();
	const iframe = useRef<any>();
	const [input, setInput] = useState('');
	const [code, setCode] = useState('');

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
		// setCode(result.outputFiles[0].text);

		// 2nd arg specifies the valid domains that can receive this message
		// The * means any domains can receive this message
		iframe.current.contentWindow.postMessage(result.outputFiles[0].text, '*');
	}

	const html = `
    <html>
    <head></head>
    <body>
      <div id='root'></div>
      <script>
        window.addEventListener('message', (event) => {
          try {
            eval(event.data)
          } catch(err) {
            const root = document.querySelector('#root');
            root.innerHTML = '<div style="color: red"><h4>Runtime Error</h4>' + err + '</div>';
            console.error(err);
          }
        }, false);
      </script>
    </body>
    </html>
  `;

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
			<iframe ref={iframe} sandbox='allow-scripts' title='test' srcDoc={html} />
		</div>
	);
}

ReactDOM.render(<App />, document.querySelector('#root'));
