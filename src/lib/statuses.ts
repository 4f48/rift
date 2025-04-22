import type { Statuses } from './types';

const statuses: Statuses = {
	initializing: {
		message: 'Initializing...',
		progress: 10,
	},
	negotiating: {
		message: 'Negotiating connection...',
		progress: 20,
	},
	files: {
		message: 'Processing files...',
		progress: 30,
	},
};

export default statuses;
