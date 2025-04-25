import { saveFile } from '$lib/files';
import type { Config, Metadata, ParsedChunk, Status } from '$lib/types';
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
	peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
		const dataChannel: RTCDataChannel = event.channel;
		dataChannel.binaryType = 'arraybuffer';

		let metadata: Metadata | undefined = undefined;
		let receivedChunks: number = 0;
		let fileStream: ReadableStream | undefined = undefined;
		let streamController: ReadableStreamController<Uint8Array> | null = null;

		fileStream = new ReadableStream({
			start(controller) {
				streamController = controller;
			},
		});

		dataChannel.onmessage = (event: MessageEvent) => {
			const buffer: ArrayBuffer = event.data;
			const view: DataView = new DataView(buffer);
			const messageType: number = view.getUint32(REGISTER_TYPE);

			switch (messageType) {
				case DATA_METADATA:
					metadata = parseMetadata(buffer, config, view);
					break;
				case DATA_CHUNK:
					{
						if (!metadata || !streamController) throw Error('must receive metadata before chunks');

						const chunk = parseChunk(buffer, config, view);
						streamController.enqueue(new Uint8Array(chunk.data));
						receivedChunks++;

						status.set({
							message: 'Receiving...',
							progress: Math.min(Math.floor((receivedChunks / metadata.totalChunks) * 100), 99),
						});
						if (receivedChunks == metadata.totalChunks) {
							streamController.close();
							assembleFile(fileStream, metadata, status);
						}
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
function parseChunk(buffer: ArrayBuffer, config: Config, view: DataView): ParsedChunk {
	const chunkSize: number = view.getUint32(REGISTER_SIZE);
	const index: number = view.getUint32(REGISTER_INDEX);
	const data: ArrayBuffer = buffer.slice(
		config.headerSize.chunk,
		config.headerSize.chunk + chunkSize
	);

	return {
		data,
		index,
		size: chunkSize,
	};
}

/**
 * Assembles the file from chunks and saves it to the user's computer.
 * @param fileStream readable stream containing chunks
 * @param metadata metadata for the file to be saved
 * @param status application status
 */
async function assembleFile(
	fileStream: ReadableStream<Uint8Array>,
	metadata: Metadata,
	status: Writable<Status | undefined>
): Promise<void> {
	const response = new Response(fileStream);
	const blob = await response.blob();
	saveFile(blob, metadata.fileName);

	status.set({
		message: 'Transfer complete!',
		progress: 100,
	});
	setTimeout(() => status.set(undefined), 1000);
}
