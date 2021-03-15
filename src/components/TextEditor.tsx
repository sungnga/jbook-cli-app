import MDEditor from '@uiw/react-md-editor';
import { useEffect, useRef, useState } from 'react';
import './TextEditor.css';

const TextEditor: React.FC = () => {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState('# Header');
	const ref = useRef<HTMLDivElement | null>(null);

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
				<MDEditor value={value} onChange={(v) => setValue(v || '')} />
			</div>
		);
	}

	return (
		<div onClick={() => setEditing(true)} className='text-editor card'>
			<div className='card-content'>
				<MDEditor.Markdown source={value} />
			</div>
		</div>
	);
};

export default TextEditor;
