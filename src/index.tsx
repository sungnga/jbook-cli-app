import 'bulmaswatch/superhero/bulmaswatch.min.css';
import ReactDOM from 'react-dom';
import CodeCell from './components/CodeCell';

function App() {
	return (
		<div>
			<CodeCell />
		</div>
	);
}

ReactDOM.render(<App />, document.querySelector('#root'));
