import { useEffect, useState } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import bundle from '../bundler';
import Resizable from './Resizable';
import { Cell } from '../state';
import { useActions } from '../hooks/useActions';

interface CodeCellProps {
	cell: Cell;
}

const CodeCell: React.FC<CodeCellProps> = ({ cell }) => {
	const [code, setCode] = useState('');
	const [err, setErr] = useState('');
	// const [input, setInput] = useState('');
	const { updateCell } = useActions();

	useEffect(() => {
		const timer = setTimeout(async () => {
			const output = await bundle(cell.content);
			setCode(output.code);
			setErr(output.err);
		}, 1000);

		return () => {
			clearTimeout(timer);
		};
	}, [cell.content]);

	return (
		<Resizable direction='vertical'>
			<div style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
				<Resizable direction='horizontal'>
					<CodeEditor
						initialValue={cell.content}
						onChange={(value) => updateCell(cell.id, value)}
					/>
				</Resizable>
				<Preview code={code} err={err} />
			</div>
		</Resizable>
	);
};

export default CodeCell;
