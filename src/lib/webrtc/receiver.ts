import { saveFile } from '$lib/files';
import type { Config, Metadata, Status } from '$lib/types';
import type { Writable } from 'svelte/store';
import {
	DATA_CHUNK,
	DATA_METADATA,
	REGISTER_CHUNKS,
	REGISTER_FILENAME_LENGTH,
	REGISTER_FILETYPE_LENGTH,
	REGISTER_INDEX,
	REGISTER_SIZE,
	REGISTER_TYPE,
} from './common';

export function receiveFile(
	config: Config,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>
): void {
	let chunks: ArrayBuffer[] = [];
	peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
		const dataChannel: RTCDataChannel = event.channel;
		dataChannel.binaryType = 'arraybuffer';

		let metadata: Metadata | undefined = undefined;
		let receivedChunks: number = 0;
		dataChannel.onmessage = (event: MessageEvent) => {
			const buffer: ArrayBuffer = event.data;
			const view: DataView = new DataView(buffer);
			const messageType: number = view.getUint32(REGISTER_TYPE);

			switch (messageType) {
				case DATA_METADATA:
					{
						metadata = parseMetadata(buffer, config, view);
						chunks = new Array(metadata.totalChunks);
					}
					break;
				case DATA_CHUNK:
					if (!metadata) throw Error('must receive metadata before chunks');
					parseChunk(buffer, chunks, config, view);
					receivedChunks++;
					status.set({
						message: 'Receiving...',
						progress: Math.min(Math.floor((receivedChunks / metadata.totalChunks) * 100), 99),
					});
					if (receivedChunks == metadata.totalChunks) {
						assembleFile(chunks, metadata, status);
					}
					break;
				default:
					throw Error(`invalid message type: ${messageType}`);
			}
		};
	};
}

/**
 * Parses the binary encoded metadata packet.
 * @param buffer message buffer
 * @param config application config
 * @param view data view for the message buffer
 * @returns an object containing file metadata
 */
function parseMetadata(buffer: ArrayBuffer, config: Config, view: DataView): Metadata {
	const fileNameLength: number = view.getUint32(REGISTER_FILENAME_LENGTH);
	const fileTypeLength: number = view.getUint32(REGISTER_FILETYPE_LENGTH);
	const fileNameBytes: Uint8Array = new Uint8Array(
		buffer,
		config.headerSize.metadata,
		fileNameLength
	);
	const fileTypeBytes: Uint8Array = new Uint8Array(
		buffer,
		config.headerSize.metadata + fileNameLength,
		fileTypeLength
	);

	const decoder: TextDecoder = new TextDecoder();
	const fileName: string = decoder.decode(fileNameBytes);
	const fileType: string = decoder.decode(fileTypeBytes);
	const fileSize: number = Number(view.getBigUint64(REGISTER_SIZE));
	const totalChunks: number = view.getUint32(REGISTER_CHUNKS);

	return {
		fileName,
		fileSize,
		fileType,
		totalChunks,
	};
}

/**
 * Parses the binary encoded chunk packet.
 * @param buffer message buffer
 * @param chunks array to push the chunk to
 * @param config application config
 * @param view data view for the message buffer
 */
function parseChunk(
	buffer: ArrayBuffer,
	chunks: ArrayBuffer[],
	config: Config,
	view: DataView
): void {
	const chunkSize: number = view.getUint32(REGISTER_SIZE);
	const index: number = view.getUint32(REGISTER_INDEX);

	const data: ArrayBuffer = buffer.slice(
		config.headerSize.chunk,
		config.headerSize.chunk + chunkSize
	);
	chunks[index] = data;
}

/**
 * Assembles the file from chunks and saves it to the user's computer.
 * @param chunks array of chunks to assemble
 * @param metadata metadata for the file to be saved
 * @param status application status
 */
function assembleFile(
	chunks: ArrayBuffer[],
	metadata: Metadata,
	status: Writable<Status | undefined>
): void {
	const blob = new Blob(chunks, {
		type: metadata.fileType,
	});
	saveFile(blob, metadata.fileName);

	status.set({
		message: 'Transfer complete!',
		progress: 100,
	});
	setTimeout(() => status.set(undefined), 1000);
}
