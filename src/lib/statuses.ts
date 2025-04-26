import type { Statuses } from './types';

const statuses: Statuses = {
	initializing: {
		message: 'Initializing...',
		progress: 0,
	},
	websocket_connecting: {
		message: 'WebSocket connecting...',
		progress: 0,
	},
	signaling: {
		message: 'Signaling...',
		progress: 0,
	},
	waiting_for_receiver: {
		message: 'Waiting for receiver...',
		progress: 0,
	},
	webrtc_connecting: {
		message: 'WebRTC connecting...',
		progress: 0,
	},
	requesting: {
		message: 'Requesting connection...',
		progress: 0,
	},
	files: {
		message: 'Processing files...',
		progress: 0,
	},
};

export default statuses;
