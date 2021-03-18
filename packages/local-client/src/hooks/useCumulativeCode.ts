import { useTypedSelector } from './useTypedSelector';

// cumulativeCode has the code from current cell plus all previous cells
export const useCumulativeCode = (cellId: string) => {
  // Returns a cumulative code that has the code
  //  from current cell plus all previous cells
	// This selector receives a state
	return useTypedSelector((state) => {
		// Reach into cells state and get data and order properties from it
		const { data, order } = state.cells;
		const orderedCells = order.map((id) => data[id]);

		const showFunc = `
      import _React from 'react';
      import _ReactDOM from 'react-dom';
      var show = (value) => {
        const root = document.querySelector('#root');

        if (typeof value === 'object') {
          if (value.$$typeof && value.props) {
            _ReactDOM.render(value, root)
          } else {
            root.innerHTML = JSON.stringify(value);
          }
        } else {
          root.innerHTML = value;
        };
      };
    `;
		const showFuncNoop = 'var show = () => {}';
		const cumulativeCode = [];
		for (let c of orderedCells) {
			if (c.type === 'code') {
				if (c.id === cellId) {
					cumulativeCode.push(showFunc);
				} else {
					cumulativeCode.push(showFuncNoop);
				}
				cumulativeCode.push(c.content);
			}
			// If c.id is the current cell.id, we break
			if (c.id === cellId) {
				break;
			}
		}
		return cumulativeCode;
	}).join('\n');
};
