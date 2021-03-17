import './CodeCell.css';
import { useEffect } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import Resizable from './Resizable';
import { Cell } from '../state';
import { useActions } from '../hooks/useActions';
import { useTypedSelector } from '../hooks/useTypedSelector';

interface CodeCellProps {
	cell: Cell;
}

const CodeCell: React.FC<CodeCellProps> = ({ cell }) => {
	// Because of useMemo hook, createBundle is a stabled function
	const { updateCell, createBundle } = useActions();
	const bundle = useTypedSelector((state) => state.bundles[cell.id]);
	// cumulativeCode has the code from current cell plus all previous cells
	// This selector receives a state
	const cumulativeCode = useTypedSelector((state) => {
		// Reach into cells state and get data and order properties from it
		const { data, order } = state.cells;
		const orderedCells = order.map((id) => data[id]);

		const cumulativeCode = [
			`
        const show = (value) => {
          if (typeof value === 'object') {
            document.querySelector('#root').innerHTML = JSON.stringify(value);
          } else {
            document.querySelector('#root').innerHTML = value;
          };
        };
      `
		];
		for (let c of orderedCells) {
			if (c.type === 'code') {
				cumulativeCode.push(c.content);
			}
			// If c.id is the current cell.id, we break
			if (c.id === cell.id) {
				break;
			}
		}
		return cumulativeCode;
	});

	console.log(cumulativeCode);

	useEffect(() => {
		if (!bundle) {
			// joined by a newline character
			createBundle(cell.id, cumulativeCode.join('\n'));
			return;
		}

		const timer = setTimeout(async () => {
			createBundle(cell.id, cumulativeCode.join('\n'));
		}, 2000);

		return () => {
			clearTimeout(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cumulativeCode.join('\n'), cell.id, createBundle]);

	return (
		<Resizable direction='vertical'>
			<div
				style={{
					height: 'calc(100% - 10px)',
					display: 'flex',
					flexDirection: 'row'
				}}
			>
				<Resizable direction='horizontal'>
					<CodeEditor
						initialValue={cell.content}
						onChange={(value) => updateCell(cell.id, value)}
					/>
				</Resizable>
				<div className='progress-wrapper'>
					{!bundle || bundle.loading ? (
						<div className='progress-cover'>
							<progress className='progress is-small is-primary' max='100'>
								Loading
							</progress>
						</div>
					) : (
						<Preview code={bundle.code} err={bundle.err} />
					)}
				</div>
			</div>
		</Resizable>
	);
};

export default CodeCell;
