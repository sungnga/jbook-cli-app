import './CellList.css';
import { Fragment } from 'react';
import { useTypedSelector } from '../hooks/useTypedSelector';
import AddCell from './AddCell';
import CellListItem from './CellListItem';

const CellList: React.FC = () => {
	// const cells = useTypedSelector(({ cells: { order, data } }) => {
	// 	return order.map((id) => data[id]);
	// });

	const { order, data } = useTypedSelector((state) => state.cells);

	const cells = order.map((id) => data[id]);

	return (
		<div className='cell-list'>
			<AddCell forceVisible={cells.length === 0} previousCellId={null} />
			{cells.map((cell) => (
				<Fragment key={cell.id}>
					<CellListItem cell={cell} />
					<AddCell previousCellId={cell.id} />
				</Fragment>
			))}
		</div>
	);
};

export default CellList;
