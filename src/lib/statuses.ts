import type { Statuses } from './types';

const statuses: Statuses = {
	initializing: {
		message: 'Initializing...',
		progress: 0,
	},
	negotiating: {
		message: 'Negotiating connection...',
		progress: 0,
	},
	files: {
		message: 'Processing files...',
		progress: 0,
	},
};

export default statuses;
