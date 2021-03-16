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
		<div>
			{cells.map((cell) => (
				<Fragment key={cell.id}>
					<AddCell nextCellId={cell.id} />
					<CellListItem cell={cell} />
				</Fragment>
			))}
			<AddCell nextCellId={null} />
		</div>
	);
};

export default CellList;
