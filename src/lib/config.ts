import { PUBLIC_TURN_ARRAY } from '$env/static/public';
import type { Config } from './types';

const config: Config = {
	bufferTreshold: 64 * 1024,
	channelLabel: 'rift',
	chunkSize: 16 * 1024,
	flareAddress: 'wss://flare.4f48.dev',
	headerSize: {
		chunk: 3 * 4,
		metadata: 4 * 4 + 8,
	},
	passphraseLength: 6,
	stunServers: [
		{ urls: 'stun:stun.cloudflare.com:3478' },
		{
			urls: 'stun:stun.cloudflare.com:53',
		},
		...JSON.parse(PUBLIC_TURN_ARRAY!),
	],
};

export default config;
