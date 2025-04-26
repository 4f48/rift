export interface Config {
	bufferTreshold: number;
	channelLabel: string;
	chunkSize: number;
	flareAddress: string;
	headerSize: HeaderSize;
	passphraseLength: number;
	stunServers: RTCIceServer[];
}

export interface CreateFileBuffer {
	buffer: ArrayBuffer;
	totalChunks: number;
}

export interface HeaderSize {
	chunk: number;
	metadata: number;
}

export interface Metadata {
	fileName: string;
	fileSize: number;
	fileType: string;
	totalChunks: number;
}

export interface ParsedChunk {
	data: ArrayBuffer;
	index: number;
	size: number;
}

export interface Status {
	message: string;
	progress: number;
}

export interface Statuses {
	initializing: Status;
	websocket_connecting: Status;
	signaling: Status;
	waiting_for_receiver: Status;
	webrtc_connecting: Status;
	requesting: Status;
	files: Status;
}

// signaling message types
interface OfferMessage {
	type: 'offer';
	passphraseLength: number;
	sdp: string;
}

interface PassphraseMessage {
	type: 'passphrase';
	passphrase: string;
}

interface AnswerMessage {
	type: 'answer';
	sdp: string;
}

interface IceCandidateMessage {
	type: 'ice-candidate';
	candidate: string;
}

interface ConnectionRequestMessage {
	type: 'connection-request';
	passphrase: string;
}

export type SignalingMessage =
	| OfferMessage
	| PassphraseMessage
	| AnswerMessage
	| IceCandidateMessage
	| ConnectionRequestMessage;
