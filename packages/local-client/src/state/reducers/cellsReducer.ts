import produce from 'immer';
import { ActionType } from '../action-types';
import { Action } from '../actions';
import { Cell } from '../cell';

interface CellsState {
	loading: boolean;
	error: string | null;
	order: string[];
	data: {
		[key: string]: Cell;
	};
}

const initialState: CellsState = {
	loading: false,
	error: null,
	order: [],
	data: {}
};

const reducer = produce((state: CellsState = initialState, action: Action) => {
	switch (action.type) {
		case ActionType.SAVE_CELLS_ERROR:
			state.error = action.payload;

			return state;
		case ActionType.FETCH_CELLS:
			state.loading = true;
			state.error = null;

			return state;
		case ActionType.FETCH_CELLS_COMPLETE:
			state.order = action.payload.map((cell) => cell.id);
			state.data = action.payload.reduce((accum, cell) => {
				accum[cell.id] = cell;
				return accum;
			}, {} as CellsState['data']);

			return state;
		case ActionType.FETCH_CELLS_ERROR:
			state.loading = false;
			state.error = action.payload;

			return state;
		case ActionType.UPDATE_CELL:
			const { id, content } = action.payload;

			state.data[id].content = content;
			return state;
		case ActionType.DELETE_CELL:
			delete state.data[action.payload];
			state.order = state.order.filter((id) => id !== action.payload);
			return state;
		case ActionType.MOVE_CELL:
			const { direction } = action.payload;
			// Return the index of the array
			const index = state.order.findIndex((id) => id === action.payload.id);
			const targetIndex = direction === 'up' ? index - 1 : index + 1;

			// Out of bound conditionals
			if (targetIndex < 0 || targetIndex > state.order.length - 1) return state;

			// Swapping cells
			state.order[index] = state.order[targetIndex];
			state.order[targetIndex] = action.payload.id;

			return state;
		case ActionType.INSERT_CELL_AFTER:
			const cell: Cell = {
				id: randomId(),
				content: '',
				type: action.payload.type
			};

			// Add new cell object to data object
			// Key is the cell id
			state.data[cell.id] = cell;

			const foundIndex = state.order.findIndex(
				(id) => id === action.payload.id
			);

			// If no index is found, add the cell id to end of order array
			// Else add cell id before foundIndex
			if (foundIndex < 0) {
				state.order.unshift(cell.id);
			} else {
				state.order.splice(foundIndex + 1, 0, cell.id);
			}

			return state;
		default:
			return state;
	}
});

const randomId = () => {
	return Math.random().toString(36).substr(2, 5);
};

export default reducer;
