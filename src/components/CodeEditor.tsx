import { useRef } from 'react';
// EditorDidMount is a type definition file
import MonacoEditor, { EditorDidMount } from '@monaco-editor/react';
import prettier from 'prettier';
import parser from 'prettier/parser-babel';

interface CodeEditorProps {
	initialValue: string;
	onChange(value: string): void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onChange, initialValue }) => {
	const editorRef = useRef<any>();

	// 1st arg is a function to get the value inside the editor
	// 2nd arg is a reference to the editor itself
	const onEditorDidMount: EditorDidMount = (getValue, monacoEditor) => {
		editorRef.current = monacoEditor;

		// This is how we get told when something
		// inside the editor is changed
		monacoEditor.onDidChangeModelContent(() => {
			// console.log(getValue())
			// When there's a change inside the editor
			// we're going to update the input state in App component
			onChange(getValue());
		});

		monacoEditor.getModel()?.updateOptions({ tabSize: 2 });
	};

	const onFormatClick = () => {
		// get current value from editor
		const unformatted = editorRef.current.getModel().getValue();

		//format that value
		const formatted = prettier.format(unformatted, {
			parser: 'babel',
			plugins: [parser],
			useTabs: false,
			semi: true,
			singleQuote: true
		});

		// set the formatted value back in the editor
		editorRef.current.setValue(formatted);
	};

	return (
		<div>
			<button onClick={onFormatClick}>Format</button>
			<MonacoEditor
				editorDidMount={onEditorDidMount}
				value={initialValue}
				theme='dark'
				options={{
					wordWrap: 'on',
					minimap: { enabled: false },
					showUnused: false,
					folding: false,
					lineNumbersMinChars: 3,
					fontSize: 16,
					scrollBeyondLastLine: false,
					automaticLayout: true
				}}
				language='javascript'
				height='500px'
			/>
		</div>
	);
};

export default CodeEditor;
