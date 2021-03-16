import MDEditor from '@uiw/react-md-editor';
import { useEffect, useRef, useState } from 'react';
import { useActions } from '../hooks/useActions';
import { Cell } from '../state';
import './TextEditor.css';

interface TextEditorProps {
	cell: Cell;
}

const TextEditor: React.FC<TextEditorProps> = ({ cell }) => {
	const [editing, setEditing] = useState(false);
	// const [value, setValue] = useState('# Header');
	const ref = useRef<HTMLDivElement | null>(null);
	const { updateCell } = useActions();

	useEffect(() => {
		const listener = (event: MouseEvent) => {
			if (
				ref.current &&
				event.target &&
				ref.current.contains(event.target as Node)
			) {
				// console.log('element clicked on is inside editor');
				return;
			}
			// console.log('element clicked is not inside editor');

			// We can use event.target to figure out what the user just clicked on
			// console.log((event.target))

			setEditing(false);
		};
		document.addEventListener('click', listener, { capture: true });

		return () => {
			document.removeEventListener('click', listener, { capture: true });
		};
	}, []);

	if (editing) {
		return (
			<div className='text-editor' ref={ref}>
				<MDEditor
					value={cell.content}
					onChange={(v) => updateCell(cell.id, v || '')}
				/>
			</div>
		);
	}

	return (
		<div onClick={() => setEditing(true)} className='text-editor card'>
			<div className='card-content'>
				<MDEditor.Markdown source={cell.content || 'Click to edit'} />
			</div>
		</div>
	);
};

export default TextEditor;
