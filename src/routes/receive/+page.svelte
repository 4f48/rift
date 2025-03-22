<script lang="ts">
	import { Button, Label, Progress } from 'bits-ui';
	import type Message from '../../app';
	import { deriveKey } from '$lib/crypto';
	import { blake3 } from '@noble/hashes/blake3';
	import { bytesToHex } from '@noble/hashes/utils';
	import { hexToBytes } from '@noble/ciphers/utils';
	import Peer from 'peerjs';
	import { xchacha20poly1305 } from '@noble/ciphers/chacha';
	import { onDestroy } from 'svelte';
	import type { DataConnection } from 'peerjs';

	let peer: Peer | undefined;

	let code = $state<string>();
	let status = $state<string>();
	let progress = $state<number>();
	let error = $state<string>();

	// For handling file transfer state
	let transferActive = $state(false);
	let abortController = new AbortController();

	function isMessage(data: unknown, type: Message.MsgBase) {
		return (
			typeof data == 'object' &&
			data !== null &&
			'type' in data &&
			(data as { type: string }).type === type.type
		);
	}

	// Helper function to decrypt chunks with minimal blocking
	async function decryptChunk(chunk: Message.Chunk, key: Uint8Array): Promise<ArrayBuffer> {
		// Yield to the event loop to prevent UI blocking
		await new Promise((resolve) => setTimeout(resolve, 0));

		try {
			const chacha = xchacha20poly1305(key, hexToBytes(chunk.nonce));
			const decryptedChunk = chacha.decrypt(hexToBytes(chunk.data));
			return decryptedChunk.slice(0).buffer;
		} catch (err) {
			console.error('Decryption error:', err);
			throw err;
		}
	}

	async function submithandler(event: SubmitEvent) {
		event.preventDefault();
		if (!code) throw Error('code is required');
		if (transferActive) return; // Prevent multiple submissions

		// Reset state
		progress = 0;
		error = undefined;
		transferActive = true;

		// Clean up any previous operations
		if (peer) {
			peer.destroy();
			peer = undefined;
		}

		// Create a new abort controller
		abortController = new AbortController();
		const { signal } = abortController;

		try {
			status = 'Generating keys...';
			progress = 33;
			const hash = bytesToHex(blake3(code));
			const key = await deriveKey(code);

			status = 'Connecting...';
			progress = 66;

			// Initialize peer connection with timeout
			const peerPromise = new Promise<Peer>((resolve, reject) => {
				const newPeer = new Peer({
					config: {
						iceServers: [
							{ urls: 'stun:stun.cloudflare.com:3478' },
							{ urls: 'stun:stun.l.google.com:19302' }
						]
					},
					debug: 0 // Disable verbose logging
				});

				const timeout = setTimeout(() => {
					reject(new Error('Connection timeout'));
				}, 30000);

				newPeer.on('open', () => {
					clearTimeout(timeout);
					resolve(newPeer);
				});

				newPeer.on('error', (err) => {
					clearTimeout(timeout);
					reject(err);
				});

				// Allow for cancellation
				signal.addEventListener('abort', () => {
					clearTimeout(timeout);
					newPeer.destroy();
					reject(new Error('Operation cancelled'));
				});
			});

			peer = await peerPromise;

			// Establish connection
			const connectionPromise = new Promise<DataConnection>((resolve, reject) => {
				if (!peer) return;
				const connection = peer.connect(hash, { reliable: true });

				const timeout = setTimeout(() => {
					reject(new Error('Connection timeout'));
				}, 30000);

				connection.on('open', () => {
					clearTimeout(timeout);
					resolve(connection);
				});

				connection.on('error', (err) => {
					clearTimeout(timeout);
					reject(err);
				});

				// Allow for cancellation
				signal.addEventListener('abort', () => {
					clearTimeout(timeout);
					connection.close();
					reject(new Error('Operation cancelled'));
				});
			});

			const connection = await connectionPromise;

			status = 'Connected. Waiting for transfer...';
			connection.send('ready');

			// Using incremental processing for better memory management
			let fileMetadata: Message.FileMeta | null = null;
			let fileChunks: ArrayBuffer[] = [];
			let pendingChunks: Message.Chunk[] = [];
			let isProcessing = false;
			let receivedSize = 0;

			// Process chunks in batches to avoid memory issues
			const processPendingChunks = async () => {
				if (isProcessing || pendingChunks.length === 0) return;

				isProcessing = true;

				try {
					// Take a reasonable batch size to process
					const batch = pendingChunks.splice(0, Math.min(20, pendingChunks.length));

					// Process all chunks in the batch concurrently but with limits
					const promises: Promise<ArrayBuffer>[] = [];
					for (const chunk of batch) {
						promises.push(decryptChunk(chunk, key));
					}

					// Wait for all decryptions to complete
					const decryptedChunks = await Promise.all(promises);

					// Add decrypted chunks to our collection
					fileChunks.push(...decryptedChunks);

					// Update received size and progress
					if (!fileMetadata) return;
					receivedSize += decryptedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
					const newProgress = Math.min(100, Math.round((receivedSize / fileMetadata.size) * 100));
					if (progress !== newProgress) {
						progress = newProgress;
						status = `Transferring: ${progress}%`;
					}

					// Send acknowledgment for flow control
					connection.send({ type: 'ack', received: receivedSize });
				} catch (err) {
					if (err instanceof Error) {
						error = err.message;
						console.error('Error processing chunks:', err);
					}
				} finally {
					isProcessing = false;

					// If there are more chunks to process, schedule them
					if (pendingChunks.length > 0) {
						setTimeout(() => processPendingChunks(), 0);
					}
				}
			};

			// Set up data handling
			return new Promise<void>((resolve, reject) => {
				let processorInterval: ReturnType<typeof setInterval>;

				const cleanup = () => {
					clearInterval(processorInterval);
					connection.close();
					if (peer) peer.destroy();
					transferActive = false;
				};

				connection.on('data', async (data: unknown) => {
					try {
						if (signal.aborted) {
							throw new Error('Operation cancelled');
						}

						if (isMessage(data, { type: 'file_meta' })) {
							// Received file metadata
							fileMetadata = data as Message.FileMeta;
							fileChunks = [];
							pendingChunks = [];
							receivedSize = 0;
							progress = 0;

							status = `Receiving ${fileMetadata.name} (${(fileMetadata.size / (1024 * 1024)).toFixed(2)} MB)`;

							// Set up periodic processing of chunks
							processorInterval = setInterval(() => {
								if (pendingChunks.length > 0 && !isProcessing) {
									processPendingChunks();
								}
							}, 50); // Run every 50ms

							// Acknowledge metadata
							connection.send({ type: 'meta_ack' });
						} else if (isMessage(data, { type: 'chunk' }) && fileMetadata) {
							// Queue chunk for processing
							pendingChunks.push(data as Message.Chunk);

							// Start processing if not already in progress and we have enough chunks
							if (!isProcessing && pendingChunks.length >= 10) {
								processPendingChunks();
							}
						} else if (isMessage(data, { type: 'finish' }) && fileMetadata) {
							status = 'Finalizing file...';

							// Process any remaining chunks
							while (pendingChunks.length > 0) {
								await processPendingChunks();
								// Brief pause to allow UI updates
								await new Promise((resolve) => setTimeout(resolve, 10));
							}

							// Create and save the file
							const file = new File(fileChunks, fileMetadata.name, {
								type: fileMetadata.fileType,
								lastModified: fileMetadata.lastModified
							});

							const download = URL.createObjectURL(file);

							const a = document.createElement('a');
							document.body.append(a);
							a.download = file.name;
							a.href = download;
							a.click();
							a.remove();

							// Clean up
							URL.revokeObjectURL(download);
							fileChunks = []; // Free memory

							status = 'Done!';

							cleanup();

							setTimeout(() => {
								progress = undefined;
								status = undefined;
							}, 300);

							resolve();
						}
					} catch (err) {
						cleanup();

						if (err instanceof Error) {
							error = err.message;
							console.error('Transfer error:', err);
						}

						reject(err);
					}
				});

				connection.on('close', () => {
					cleanup();
					if (!error && status !== 'Done!') {
						error = 'Connection closed unexpectedly';
						reject(new Error(error));
					}
				});

				connection.on('error', (err) => {
					cleanup();
					error = err.message;
					console.error('Connection error:', err);
					reject(err);
				});

				// Cleanup on abort
				signal.addEventListener('abort', () => {
					cleanup();
					reject(new Error('Operation cancelled'));
				});
			});
		} catch (err) {
			transferActive = false;

			if (signal.aborted) {
				// Operation was cancelled intentionally
				return;
			}

			if (err instanceof Error) {
				error = err.message;
				console.error('Transfer failed:', err);
			}

			if (peer) {
				peer.destroy();
				peer = undefined;
			}
		}
	}

	// Function to cancel an ongoing transfer
	function cancelTransfer() {
		if (transferActive) {
			abortController.abort();
			status = 'Transfer cancelled';
			setTimeout(() => {
				progress = undefined;
				status = undefined;
				transferActive = false;
			}, 300);
		}
	}

	// Clean up on component destruction
	onDestroy(() => {
		// Cancel any ongoing operations
		abortController.abort();

		// Clean up PeerJS
		if (peer) {
			peer.destroy();
		}
	});
</script>

<div class="flex h-full w-full items-center justify-center">
	<main
		class="mx-6 w-full overflow-hidden rounded-2xl border-gray-200 bg-white shadow-2xl md:mx-0 md:w-[30vw]"
	>
		<form class="flex flex-col items-center gap-2 p-6" onsubmit={submithandler}>
			<Label.Root for="code">Transmit Code</Label.Root>
			<input
				id="code"
				class="mx-6 w-full rounded-full border border-gray-200 drop-shadow-xl focus:border-blue-400 focus:ring-0 focus:outline-none"
				autocomplete="off"
				required
				bind:value={code}
				disabled={transferActive}
			/>

			{#if !transferActive}
				<Button.Root
					class="cursor-pointer rounded-full bg-blue-600 px-6 py-2 text-white drop-shadow-lg duration-300 hover:bg-blue-800"
					type="submit"
				>
					Receive
				</Button.Root>
			{:else}
				<Button.Root
					class="cursor-pointer rounded-full bg-red-600 px-6 py-2 text-white drop-shadow-lg duration-300 hover:bg-red-800"
					type="button"
					onclick={cancelTransfer}
				>
					Cancel
				</Button.Root>
			{/if}

			{#if !error}
				<p class="mt-3 text-gray-500">{status}</p>
			{:else}
				<p class="mt-3 text-justify text-wrap break-all text-red-700">Error: {error}</p>
			{/if}
		</form>
		<Progress.Root value={progress} class="relative h-6 w-full overflow-hidden bg-gray-200">
			{#if !error}
				<div
					class="h-full w-full flex-1 bg-blue-500 transition-all duration-500 ease-in-out"
					style={`transform: translateX(-${100 - (100 * (progress ?? 0)) / 100}%)`}
				></div>
			{:else}
				<div class="h-full w-full flex-1 bg-red-500 transition-all duration-500 ease-in-out"></div>
			{/if}
		</Progress.Root>
	</main>
</div>
