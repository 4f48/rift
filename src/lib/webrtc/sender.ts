import type { Config, Status } from '$lib/types';
import { toast } from 'svelte-sonner';
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

/**
 * Handles transferring the file to the receiver.
 * @param config application config
 * @param dataChannel webrtc data channel used for communication
 * @param file file to send
 * @param status status of the application
 */
export function transferFile(
	config: Config,
	dataChannel: RTCDataChannel,
	file: File,
	status: Writable<Status | undefined>,
	webSocket: WebSocket
): void {
	dataChannel.onopen = () => {
		const totalChunks: number = Math.ceil(file.size / config.chunkSize);
		sendMetadata(totalChunks, config, dataChannel, file);

		let offset: number = 0;
		let index: number = 0;
		const sendNextChunk = async () => {
			if (offset >= file.size) {
				status.set({
					message: 'Transfer complete!',
					progress: 100,
				});
				setTimeout(() => status.set(undefined), 1000);
				toast.success('Transfer complete.', {
					description: `Successfully sent ${file.name}.`,
				});
				webSocket.close();
				dataChannel.close();
				return;
			}

			const chunk: Blob = file.slice(offset, offset + config.chunkSize);
			const buffer: ArrayBuffer = await chunk.arrayBuffer();
			sendChunk(buffer, config, dataChannel, index);
			offset += config.chunkSize;
			index++;

			status.set({
				message: 'Transferring...',
				progress: Math.min(Math.floor((offset / file.size) * 100), 99),
			});

			setTimeout(sendNextChunk, 0);
		};
		sendNextChunk();
	};
}

/**
 * Assembles a metadata message and sends it to the receiver.
 * @param chunks number of chunks that will be transmitted
 * @param dataChannel webrtc data channel to use for communication
 * @param file the file to extract metadata from
 */
function sendMetadata(
	chunks: number,
	config: Config,
	dataChannel: RTCDataChannel,
	file: File
): void {
	const encoder: TextEncoder = new TextEncoder();
	const fileName: Uint8Array = encoder.encode(file.name);
	const fileType: Uint8Array = encoder.encode(file.type);
	const messageSize: number = config.headerSize.metadata + fileName.length + fileType.length;
	const fileSize: bigint = BigInt(file.size);

	const buffer: ArrayBuffer = new ArrayBuffer(messageSize);
	const view: DataView = new DataView(buffer);

	view.setUint32(REGISTER_TYPE, DATA_METADATA);
	view.setBigUint64(REGISTER_SIZE, fileSize);
	view.setUint32(REGISTER_CHUNKS, chunks);
	view.setUint32(REGISTER_FILENAME_LENGTH, fileName.length);
	view.setUint32(REGISTER_FILETYPE_LENGTH, fileType.length);

	new Uint8Array(buffer, config.headerSize.metadata, fileName.length).set(fileName);
	new Uint8Array(buffer, config.headerSize.metadata + fileName.length, fileType.length).set(
		fileType
	);
	dataChannel.send(buffer);
}

/**
 * Creates and sends a binary encoded chunk with some metadata.
 * @param buffer chunk to send
 * @param config application config
 * @param dataChannel webrtc data channel used for communication
 * @param index index of the current chunk
 */
async function sendChunk(
	buffer: ArrayBuffer,
	config: Config,
	dataChannel: RTCDataChannel,
	index: number
): Promise<void> {
	const message: ArrayBuffer = new ArrayBuffer(config.headerSize.chunk + buffer.byteLength);
	const view: DataView = new DataView(message);

	view.setUint32(REGISTER_TYPE, DATA_CHUNK);
	view.setUint32(REGISTER_SIZE, buffer.byteLength);
	view.setUint32(REGISTER_INDEX, index);

	new Uint8Array(message, config.headerSize.chunk).set(new Uint8Array(buffer));

	if (dataChannel.bufferedAmount > config.bufferTreshold) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	dataChannel.send(message);
}
