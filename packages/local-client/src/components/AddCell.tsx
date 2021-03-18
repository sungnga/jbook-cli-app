import { useActions } from '../hooks/useActions';
import './AddCell.css';

interface AddCellProps {
	previousCellId: string | null;
	forceVisible?: boolean;
}

const AddCell: React.FC<AddCellProps> = ({ forceVisible, previousCellId }) => {
	const { insertCellAfter } = useActions();

	return (
		<div className={`add-cell ${forceVisible && 'force-visible'}`}>
			<div className='add-buttons'>
				<button
					onClick={() => insertCellAfter(previousCellId, 'code')}
					className='button is-rounded is-primary is-small'
				>
					<span className='icon is-small'>
						<i className='fas fa-plus' />
					</span>
					<span>Code</span>
				</button>
				<button
					onClick={() => insertCellAfter(previousCellId, 'text')}
					className='button is-rounded is-primary is-small'
				>
					<span className='icon is-small'>
						<i className='fas fa-plus' />
					</span>
					<span>Text</span>
				</button>
			</div>
			<div className='divider' />
		</div>
	);
};

export default AddCell;
