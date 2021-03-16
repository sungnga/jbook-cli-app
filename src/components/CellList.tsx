import { useTypedSelector } from '../hooks/useTypedSelector';
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
				<CellListItem key={cell.id} cell={cell} />
			))}
		</div>
	);
};

export default CellList;
