<script lang="ts">
	import { Button } from 'bits-ui';
	import { Peer } from 'peerjs';
	import type { DataConnection } from 'peerjs';
	import { onDestroy } from 'svelte';
	import CryptoJS from 'crypto-js';

	let passphrase = $state<string>('');
	let status = $state<string>('Enter the passphrase to receive files');
	let progress = $state<number>(0);
	let fileInfo = $state<{ name: string; size: number; fileType: string; iv: string } | null>(null);
	let downloadUrl = $state<string>('');
	let downloadFilename = $state<string>('');
	let receivedChunks: string[] = []; // Store encrypted chunks
	let peer: Peer;
	let connection: DataConnection | null = null;
	let totalReceived = 0;

	interface FileInfo {
		type: 'file-info';
		name: string;
		size: number;
		fileType: string;
		iv: string;
	}

	interface ChunkData {
		type: 'chunk';
		data: string; // Base64 encoded encrypted data
	}

	interface DoneSignal {
		type: 'done';
	}

	function isFileInfo(data: unknown): data is FileInfo {
		return (
			typeof data === 'object' &&
			data !== null &&
			'type' in data &&
			(data as { type: string }).type === 'file-info'
		);
	}

	function isChunkData(data: unknown): data is ChunkData {
		return (
			typeof data === 'object' &&
			data !== null &&
			'type' in data &&
			(data as { type: string }).type === 'chunk'
		);
	}

	function isDoneSignal(data: unknown): data is DoneSignal {
		return (
			typeof data === 'object' &&
			data !== null &&
			'type' in data &&
			(data as { type: string }).type === 'done'
		);
	}

	function deriveEncryptionKey(passphrase: string): string {
		// Use PBKDF2 to derive a strong key from the passphrase
		return CryptoJS.PBKDF2(passphrase, 'wormhole-salt', {
			keySize: 256 / 32,
			iterations: 10000
		}).toString();
	}

	function receiveHandler(event: SubmitEvent) {
		event.preventDefault();
		if (!passphrase) {
			status = 'Please enter the passphrase';
			return;
		}

		status = 'Connecting to sender...';
		progress = 0;
		downloadUrl = '';
		receivedChunks = [];
		totalReceived = 0;

		// Derive the connection ID from the passphrase
		const passphraseHash = CryptoJS.SHA256(passphrase).toString();
		const connectionId = passphraseHash.substring(0, 10);

		// Derive the encryption key from the passphrase
		const encryptionKey = deriveEncryptionKey(passphrase);

		// Create a new PeerJS instance
		peer = new Peer({
			debug: 2,
			config: {
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' }
				]
			}
		});

		peer.on('open', () => {
			connection = peer.connect(connectionId, { reliable: true });

			connection.on('open', () => {
				status = 'Connected to sender! Waiting for file...';

				if (!connection) return;
				// Signal to the sender we're ready to receive
				connection.send('ready');

				connection.on('data', (data: unknown) => {
					if (isFileInfo(data)) {
						// Reset for new file
						fileInfo = data;
						receivedChunks = [];
						totalReceived = 0;
						progress = 0;

						if (downloadUrl) {
							URL.revokeObjectURL(downloadUrl);
							downloadUrl = '';
						}

						status = `Receiving: ${data.name} (${Math.round(data.size / 1024)} KB)`;
						console.log('File info received:', data);
					} else if (isChunkData(data)) {
						// Add encrypted chunk to our collection
						receivedChunks.push(data.data);

						// Estimate progress based on number of chunks
						// This is an approximation since encrypted chunks may vary in size
						totalReceived += 1;
						const estimatedTotalChunks = Math.ceil(fileInfo!.size / (16 * 1024));
						progress = Math.min(100, Math.round((totalReceived / estimatedTotalChunks) * 100));
						status = `Receiving: ${progress}%`;
					} else if (isDoneSignal(data)) {
						// Decrypt and combine all chunks to form the complete file
						try {
							status = 'Decrypting file...';

							if (!fileInfo) {
								throw new Error('No file information received');
							}

							// Get the IV from file info
							const iv = CryptoJS.enc.Hex.parse(fileInfo.iv);

							// Decrypt each chunk and combine
							const decryptedChunks: ArrayBuffer[] = [];

							for (const encryptedChunk of receivedChunks) {
								// Decrypt the chunk
								const decrypted = CryptoJS.AES.decrypt(
									encryptedChunk,
									CryptoJS.enc.Hex.parse(encryptionKey),
									{
										iv: iv,
										mode: CryptoJS.mode.CBC,
										padding: CryptoJS.pad.Pkcs7
									}
								);

								// Convert WordArray to ArrayBuffer
								const wordArray = decrypted;
								const arrayBuffer = wordArrayToArrayBuffer(wordArray);
								decryptedChunks.push(arrayBuffer);
							}

							// Combine all chunks
							const blob = new Blob(decryptedChunks, {
								type: fileInfo.fileType || 'application/octet-stream'
							});

							downloadUrl = URL.createObjectURL(blob);
							downloadFilename = fileInfo.name || 'download';

							status = 'File received and decrypted successfully!';
						} catch (error) {
							status = `Error decrypting file: ${error instanceof Error ? error.message : String(error)}`;
							console.error('Error decrypting file:', error);
						}
					}
				});
			});

			connection.on('error', (err: Error) => {
				status = `Connection error: ${err.message}`;
				console.error('Connection error:', err);
			});
		});

		peer.on('error', (err: Error) => {
			status = `Error: ${err.message}`;
			console.error('PeerJS error:', err);
		});
	}

	// Helper function to convert CryptoJS WordArray to ArrayBuffer
	function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
		const words = wordArray.words;
		const sigBytes = wordArray.sigBytes;
		const buff = new ArrayBuffer(sigBytes);
		const view = new DataView(buff);

		for (let i = 0; i < sigBytes; i += 1) {
			const bytePosition = i >>> 2;
			const byteShift = 24 - (i % 4) * 8;
			view.setUint8(i, (words[bytePosition] >>> byteShift) & 0xff);
		}

		return buff;
	}

	function resetConnection() {
		if (peer) {
			peer.destroy();
		}
		if (downloadUrl) {
			URL.revokeObjectURL(downloadUrl);
		}
		status = 'Enter the passphrase to receive files';
		progress = 0;
		downloadUrl = '';
		fileInfo = null;
		passphrase = '';
	}

	onDestroy(() => {
		if (peer) {
			peer.destroy();
		}
		if (downloadUrl) {
			URL.revokeObjectURL(downloadUrl);
		}
	});
</script>

<h1>Receive File</h1>
<form class="flex w-full flex-col gap-1" onsubmit={receiveHandler}>
	<label for="passphrase">Passphrase</label>
	<input
		name="passphrase"
		id="passphrase"
		required
		type="text"
		bind:value={passphrase}
		class="rounded border p-2"
		placeholder="Enter the passphrase from sender"
	/>

	<Button.Root
		type="submit"
		class="mt-2 border p-1 hover:border-black hover:bg-gray-300"
		disabled={!passphrase || status.includes('Receiving')}
	>
		Receive File
	</Button.Root>
</form>

<div class="mt-4">
	<p class="font-medium">{status}</p>

	{#if progress > 0}
		<div class="mt-2 h-2.5 w-full rounded-full bg-gray-200">
			<div class="h-2.5 rounded-full bg-blue-600" style="width: {progress}%"></div>
		</div>
	{/if}

	{#if downloadUrl}
		<div class="mt-4 rounded border bg-gray-50 p-3">
			<p class="font-medium">File ready: {downloadFilename}</p>
			<div class="mt-2 flex gap-2">
				<a
					href={downloadUrl}
					download={downloadFilename}
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Download
				</a>
				<button class="rounded border px-4 py-2 hover:bg-gray-100" onclick={resetConnection}>
					Reset
				</button>
			</div>
		</div>
	{/if}
</div>
