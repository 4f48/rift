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

// Add File System Access API types
interface FileSystemWriteChunkType {
	type: 'write' | 'seek' | 'truncate';
	position?: number;
	size?: number;
	data?: BufferSource | Blob | string;
}

interface FileSystemWritableFileStream {
	write(data: BufferSource | FileSystemWriteChunkType): Promise<void>;
	seek(position: number): Promise<void>;
	truncate(size: number): Promise<void>;
	close(): Promise<void>;
}

interface FileSystemFileHandle {
	createWritable(): Promise<FileSystemWritableFileStream>;
}

interface SaveFilePickerOptions {
	suggestedName?: string;
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
}

interface WindowWithFilePicker extends Window {
	showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}

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
		let nextChunkToProcess: number = 0;
		const chunkBuffer: Map<number, ArrayBuffer> = new Map(); // Store only out-of-order chunks

		// For browsers without File System Access API
		const chunksForBlob: ArrayBuffer[] = [];
		let fileWriter: FileSystemWritableFileStream | null = null;

		// Function to process chunks in order once they're available
		const processChunks = async (): Promise<void> => {
			while (chunkBuffer.has(nextChunkToProcess)) {
				const chunk = chunkBuffer.get(nextChunkToProcess);
				if (!chunk) continue; // TypeScript safety check

				// For browsers with File System Access API
				if (fileWriter) {
					await fileWriter.write(chunk);
				} else {
					// Append to blob for other browsers (less efficient)
					chunksForBlob.push(chunk);
				}

				// Remove processed chunk from buffer
				chunkBuffer.delete(nextChunkToProcess);
				nextChunkToProcess++;
			}

			// If we've processed all chunks, finalize the file
			if (metadata && nextChunkToProcess === metadata.totalChunks) {
				await finalizeFile();
			}
		};

		const finalizeFile = async (): Promise<void> => {
			if (fileWriter) {
				await fileWriter.close();
				status.set({
					message: 'Transfer complete!',
					progress: 100,
				});
			} else {
				// Create blob from accumulated chunks (only for browsers without File System API)
				const blob = new Blob(chunksForBlob, {
					type: metadata?.fileType || 'application/octet-stream',
				});
				saveFile(blob, metadata?.fileName || 'download');

				status.set({
					message: 'Transfer complete!',
					progress: 100,
				});
			}
			setTimeout(() => status.set(undefined), 1000);
		};

		// Try to use File System Access API if available
		const setupFileWriter = async (): Promise<boolean> => {
			const windowWithFilePicker = window as unknown as WindowWithFilePicker;
			if ('showSaveFilePicker' in window) {
				try {
					if (!metadata) return false;

					const fileHandle = await windowWithFilePicker.showSaveFilePicker({
						suggestedName: metadata.fileName,
						types: [
							{
								description: 'File',
								accept: {
									[metadata.fileType || 'application/octet-stream']: [
										metadata.fileName.includes('.')
											? '.' + metadata.fileName.split('.').pop()
											: '.bin',
									],
								},
							},
						],
					});
					fileWriter = await fileHandle.createWritable();
					return true;
				} catch (e) {
					if (e instanceof Error) console.error(e);
					console.log('User cancelled or File System Access API failed, falling back');
					return false;
				}
			}
			return false;
		};

		dataChannel.onmessage = async (event: MessageEvent): Promise<void> => {
			const buffer: ArrayBuffer = event.data;
			const view: DataView = new DataView(buffer);
			const messageType: number = view.getUint32(REGISTER_TYPE);

			switch (messageType) {
				case DATA_METADATA:
					metadata = parseMetadata(buffer, config, view);
					await setupFileWriter();
					break;

				case DATA_CHUNK:
					{
						if (!metadata) throw Error('must receive metadata before chunks');

						const chunk = parseChunk(buffer, config, view);
						receivedChunks++;

						// Store chunk in buffer
						chunkBuffer.set(chunk.index, chunk.data);

						// Try to process chunks in order
						await processChunks();

						status.set({
							message: 'Receiving...',
							progress: Math.min(Math.floor((receivedChunks / metadata.totalChunks) * 100), 99),
						});
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
