<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import JSZip from 'jszip';
	import { Peer } from 'peerjs';
	import type { DataConnection } from 'peerjs';
	import CryptoJS from 'crypto-js';

	// EFF short wordlist (partial - in a real implementation you'd include the full list)
	const effWordlist = [
		'abacus',
		'abdomen',
		'abdominal',
		'abide',
		'abiding',
		'ability',
		'ablaze',
		'able',
		'abnormal',
		'abrasion',
		'abrasive',
		'abreast',
		'abridge',
		'abroad',
		'abruptly',
		'absence',
		'absentee',
		'absently',
		'absinthe',
		'absolute',
		'absolve',
		'abstain',
		'abstract',
		'absurd',
		'accent',
		'acclaim',
		'acclimate',
		'accompany',
		'account',
		'accuracy',
		'accurate',
		'accustom',
		'acetone',
		'achiness',
		'aching',
		'acid',
		'acorn',
		'acquaint',
		'acquire',
		'acre',
		'acrobat',
		'acronym',
		'acting',
		'action',
		'activate',
		'activator',
		'active',
		'activism',
		'activist',
		'activity'
		// ... more words would be included in a real implementation
	];

	let open = $state(false);
	let passphrase = $state<string>('');
	let status = $state<string>('Ready');
	let progress = $state<number>(0);
	let peer: Peer;
	let connection: DataConnection | null = null;

	type FileInfo = {
		type: 'file-info';
		name: string;
		size: number;
		fileType: string;
		iv: string;
	};

	type ChunkData = {
		type: 'chunk';
		data: string; // Base64 encoded encrypted data
	};

	type DoneSignal = {
		type: 'done';
	};

	function generatePassphrase(wordCount: number = 6): string {
		// Generate a secure passphrase with the specified number of words
		const selectedWords: string[] = [];
		const availableWords = [...effWordlist];

		// Select random words without replacement
		for (let i = 0; i < wordCount && availableWords.length > 0; i++) {
			const randomIndex = Math.floor(
				CryptoJS.lib.WordArray.random(4).words[0] % availableWords.length
			);
			selectedWords.push(availableWords[randomIndex]);
			availableWords.splice(randomIndex, 1);
		}

		// Join with hyphens as per EFF's example format
		return selectedWords.join('-');
	}

	function deriveEncryptionKey(passphrase: string): string {
		// Use PBKDF2 to derive a strong key from the passphrase
		return CryptoJS.PBKDF2(passphrase, 'wormhole-salt', {
			keySize: 256 / 32,
			iterations: 10000
		}).toString();
	}

	let input = $state<HTMLInputElement>();
	async function sendHandler(event: SubmitEvent) {
		event.preventDefault();
		if (!input) return;
		const files = Array.from(input.files || []);
		if (files.length === 0) return;

		status = 'Preparing file...';

		// Generate a secure passphrase
		passphrase = generatePassphrase(4); // 4 words is a good balance of security and usability
		const encryptionKey = deriveEncryptionKey(passphrase);

		// Extract a numeric identifier from the passphrase for connection
		const passphraseHash = CryptoJS.SHA256(passphrase).toString();
		const connectionId = passphraseHash.substring(0, 10);

		let file: File;
		if (files.length == 1) {
			file = files[0];
		} else {
			const zip = new JSZip();
			for (const file of files) {
				zip.file(file.name, file);
			}
			const blob = await zip.generateAsync({
				type: 'blob',
				compression: 'DEFLATE',
				streamFiles: true
			});
			file = new File([blob], 'files.zip', {
				type: 'application/zip',
				lastModified: new Date().getTime()
			});
		}

		// Create a new PeerJS instance with the derived connection ID
		peer = new Peer(connectionId, {
			debug: 2,
			config: {
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' }
				]
			}
		});

		peer.on('open', () => {
			status = 'Waiting for receiver to connect...';
			open = true;
		});

		peer.on('connection', (conn: DataConnection) => {
			connection = conn;
			status = 'Receiver connected!';

			connection.on('open', () => {
				status = 'Connection open, ready to send';

				if (!connection) return;
				// When the receiver signals they're ready
				connection.on('data', (data: unknown) => {
					if (data === 'ready') {
						sendFile(file, encryptionKey);
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

	async function sendFile(file: File, encryptionKey: string) {
		if (!connection) {
			status = 'No connection available';
			return;
		}

		try {
			status = 'Starting file transfer...';

			// Generate initialization vector for AES encryption
			const iv = CryptoJS.lib.WordArray.random(16);
			const ivString = iv.toString();

			// First send file metadata
			const fileInfo: FileInfo = {
				type: 'file-info',
				name: file.name,
				size: file.size,
				fileType: file.type,
				iv: ivString
			};
			connection.send(fileInfo);

			// Read file as ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();
			const chunkSize = 16 * 1024; // 16KB chunks
			let offset = 0;

			const sendNextChunk = () => {
				if (!connection) return;

				if (offset >= arrayBuffer.byteLength) {
					// We're done
					const doneSignal: DoneSignal = { type: 'done' };
					connection.send(doneSignal);
					status = 'File sent successfully!';
					return;
				}

				// Calculate the end of this chunk
				const end = Math.min(offset + chunkSize, arrayBuffer.byteLength);
				// Create a new chunk from the array buffer
				const chunk = arrayBuffer.slice(offset, end);

				// Convert chunk to WordArray for CryptoJS
				const wordArray = CryptoJS.lib.WordArray.create(chunk);

				// Encrypt the chunk
				const encryptedChunk = CryptoJS.AES.encrypt(
					wordArray,
					CryptoJS.enc.Hex.parse(encryptionKey),
					{
						iv: iv,
						mode: CryptoJS.mode.CBC,
						padding: CryptoJS.pad.Pkcs7
					}
				);

				// Send the encrypted chunk
				const chunkData: ChunkData = {
					type: 'chunk',
					data: encryptedChunk.toString()
				};
				connection.send(chunkData);

				// Update progress
				offset = end;
				progress = Math.min(100, Math.round((offset / arrayBuffer.byteLength) * 100));
				status = `Sending: ${progress}%`;

				// Schedule the next chunk
				setTimeout(sendNextChunk, 0);
			};

			// Start sending chunks
			sendNextChunk();
		} catch (error) {
			status = `Error sending file: ${error instanceof Error ? error.message : String(error)}`;
			console.error('Error sending file:', error);
		}
	}

	function closeDialog() {
		if (peer) {
			peer.destroy();
		}
		open = false;
		status = 'Ready';
		progress = 0;
	}
</script>

<h1>Add Files...</h1>
<form class="flex w-full flex-col gap-1" onsubmit={sendHandler}>
	<label for="file" class="flex w-full flex-col items-center border border-dashed p-2">
		<p>Drop files here or</p>
		<span class="border p-1 hover:border-black hover:bg-gray-300" role="button"
			>Select files...</span
		>
	</label>
	<input type="file" name="file" multiple id="file" class="hidden" required bind:this={input} />
	<Button.Root type="submit" class="border p-1 hover:border-black hover:bg-gray-300"
		>Begin</Button.Root
	>
</form>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 h-full w-full bg-black/80" />
		<Dialog.Content class="fixed inset-0 z-50 flex h-full w-full items-center justify-center">
			<div class="w-full max-w-md rounded-lg bg-white p-4">
				<Dialog.Title class="text-xl font-bold">Your passphrase</Dialog.Title>
				<Dialog.Description class="mt-2">
					Share this passphrase with the receiver. They'll use it to connect and decrypt the file.
				</Dialog.Description>
				<p class="mt-3 border bg-gray-50 p-2 text-center font-mono select-all">{passphrase}</p>

				<div class="mt-4">
					<p class="font-medium">{status}</p>
					{#if progress > 0}
						<div class="mt-2 h-2.5 w-full rounded-full bg-gray-200">
							<div class="h-2.5 rounded-full bg-blue-600" style="width: {progress}%"></div>
						</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end">
					<Dialog.Close>
						<button class="rounded border px-4 py-2 hover:bg-gray-100" onclick={closeDialog}>
							Cancel
						</button>
					</Dialog.Close>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
