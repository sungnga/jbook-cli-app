import './CellListItem.css';
import { Cell } from '../state';
import ActionBar from './ActionBar';
import CodeCell from './CodeCell';
import TextEditor from './TextEditor';
import { Fragment } from 'react';

interface CellListItemProps {
	cell: Cell;
}

const CellListItem: React.FC<CellListItemProps> = ({ cell }) => {
	let child: JSX.Element;
	if (cell.type === 'code') {
		child = (
			<Fragment>
				<div className='action-bar-wrapper'>
					<ActionBar id={cell.id} />
				</div>
				<CodeCell cell={cell} />
			</Fragment>
		);
	} else {
		child = (
			<Fragment>
				<TextEditor cell={cell} />
				<ActionBar id={cell.id} />
			</Fragment>
		);
	}

	return <div className='cell-list-item'>{child}</div>;
};

export default CellListItem;
