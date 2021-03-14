import { useEffect, useState } from 'react';
import { ResizableBox, ResizableBoxProps } from 'react-resizable';
import './Resizable.css';

interface ResizableProps {
	direction: 'horizontal' | 'vertical';
}

const Resizable: React.FC<ResizableProps> = ({ direction, children }) => {
	let resizableProps: ResizableBoxProps;
	const [innerHeight, setInnerHeight] = useState(window.innerHeight);
	const [innerWidth, setInnerWidth] = useState(window.innerWidth);

	console.log(innerWidth, innerHeight);
	useEffect(() => {
		let timer: any;
		const listener = () => {
			// This technique refers to as debouncing
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				setInnerHeight(window.innerHeight);
				setInnerWidth(window.innerWidth);
			}, 100);
		};
		window.addEventListener('resize', listener);

		return () => {
			window.removeEventListener('resize', listener);
		};
	}, []);

	if (direction === 'horizontal') {
		resizableProps = {
			className: 'resize-horizontal',
			width: window.innerWidth * 0.75,
			height: Infinity,
			resizeHandles: ['e'],
			maxConstraints: [innerWidth * 0.75, Infinity],
			minConstraints: [innerWidth * 0.2, Infinity]
		};
	} else {
		resizableProps = {
			height: 300,
			width: Infinity,
			resizeHandles: ['s'],
			maxConstraints: [Infinity, innerHeight * 0.9],
			minConstraints: [Infinity, 50]
		};
	}

	return <ResizableBox {...resizableProps}>{children}</ResizableBox>;
};

export default Resizable;
