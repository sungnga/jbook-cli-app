import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../state';

export function useActions() {
	const dispatch = useDispatch();

	// useMemo hook is like a useState and useEffect hooks put together
	// Whenever dispatch changes, React will run the useMemo callback
	// useMemo will only be called once, unless dispatch changes
	// We are binding the actionCreators only one time
	return useMemo(() => {
		return bindActionCreators(actionCreators, dispatch);
	}, [dispatch]);
}
