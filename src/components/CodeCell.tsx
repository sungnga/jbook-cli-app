import { useState } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import bundle from '../bundler';
import Resizable from './Resizable';

function CodeCell() {
	const [code, setCode] = useState('');
	const [input, setInput] = useState('');

	async function onClick() {
		const output = await bundle(input);
		setCode(output);
	}

	return (
		<Resizable direction='vertical'>
			<div style={{height: '100%', display: 'flex', flexDirection: 'row'}}>
				<CodeEditor
					initialValue='const a = 1;'
					onChange={(value) => setInput(value)}
				/>
				<Preview code={code} />
			</div>
		</Resizable>
	);
}

export default CodeCell;
