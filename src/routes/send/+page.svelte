<script lang="ts">
	import { generateTransmitCode, getWordList } from '$lib/code';
	import type Message from '../../app';
	import { processFiles } from '$lib/files';
	import { deriveKey } from '$lib/crypto';
	import { Button, Dialog, Label, Progress } from 'bits-ui';
	import Copy from 'phosphor-svelte/lib/Copy';
	import QR from '@svelte-put/qr/svg/QR.svelte';
	import { toast } from 'svelte-sonner';
	import Peer, { type DataConnection } from 'peerjs';
	import { blake3 } from '@noble/hashes/blake3';
	import { bytesToHex } from '@noble/hashes/utils';
	import { randomBytes } from '@noble/ciphers/webcrypto';
	import { xchacha20poly1305 } from '@noble/ciphers/chacha';

	let dialogOpen = $state(false);
	let progress = $state(0);
	let fileInput = $state<HTMLInputElement>();
	let peer: Peer;

	let stage = $state<string>();
	let stageDescription = $state<string>();
	let status = $state<string>();
	let fileName = $state<string>();
	let code = $state<string>();
	let error = $state<string>();

	async function changeHandler(event: Event) {
		event.preventDefault();
		error = undefined;
		if (!fileInput) throw Error('fileInput is undefined');
		if (!fileInput.files) throw Error('no files uploaded');

		stage = 'Preparing...';
		stageDescription = 'Please wait while we get things ready for you.';
		dialogOpen = true;

		status = 'Processing files...';
		progress = 20;
		const file = await processFiles(fileInput.files);
		fileName = file.name;

		status = 'Generating secure transmit code...';
		setTimeout(() => (progress = 40), 100);
		const wordList = await getWordList();
		code = await generateTransmitCode(4, wordList);

		status = 'Generating keys...';
		setTimeout(() => (progress = 60), 100);
		const hash = bytesToHex(blake3(code));
		const key = await deriveKey(code);

		status = 'Connecting...';
		setTimeout(() => (progress = 80), 100);
		peer = new Peer(hash, {
			config: {
				iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }]
			}
		});

		peer.on('open', () => {
			status = 'Done!';
			setTimeout(() => (progress = 100), 100);
			setTimeout(() => {
				status = undefined;
				progress = 0;
			}, 500);
		});

		peer.on('connection', (connection: DataConnection) => {
			stage = 'Connecting...';
			stageDescription = 'Preparing for file transfer.';
			status = 'Connection inbound...';
			setTimeout(() => (progress = 10), 100);

			connection.on('data', (data: unknown) => {
				if (data == 'ready') {
					status = 'Ready for transfer...';
					setTimeout(() => (progress = 20), 100);

					if (!code) throw Error('failed to get code');
					transferFile(file, key, connection);
				}
			});
			connection.on('error', (err) => {
				error = err.message;
				throw Error(error);
			});
		});
		peer.on('error', (err) => {
			error = err.message;
			throw Error(error);
		});
	}

	async function transferFile(file: File, key: Uint8Array, connection: DataConnection) {
		try {
			status = 'Initiating file transfer...';

			const metadata: Message.FileMeta = {
				type: 'file_meta',
				name: file.name,
				size: file.size,
				lastModified: file.lastModified,
				fileType: file.type
			};
			connection.send(metadata);

			const arrBuf = await file.arrayBuffer();
			const chunkSize = 16 * 1024;

			let offset = 0;
			stage = 'Transfering...';
			const nextChunk = () => {
				if (offset >= arrBuf.byteLength) {
					const finishSignal: Message.Finish = {
						type: 'finish',
						fileHash: blake3(new Uint8Array(arrBuf)).toBase64()
					};
					connection.send(finishSignal);

					status = 'Done!';

					connection.close();
					peer.destroy();

					setTimeout(() => (dialogOpen = false), 300);
					return;
				}

				const end = Math.min(offset + chunkSize, arrBuf.byteLength);
				const chunk = arrBuf.slice(offset, end);

				const nonce = randomBytes(24);
				const chacha = xchacha20poly1305(key, nonce);
				const encryptedChunk = chacha.encrypt(new Uint8Array(chunk));
				const msg: Message.Chunk = {
					type: 'chunk',
					data: bytesToHex(encryptedChunk),
					nonce: bytesToHex(nonce)
				};
				connection.send(msg);

				offset = end;
				progress = Math.min(100, Math.round((offset / arrBuf.byteLength) * 100));
				status = `Transfering: ${progress}%`;

				setTimeout(nextChunk, 0);
			};

			nextChunk();
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
				console.error(err);
			}
		}
	}

	function copyCode() {
		if (!code) throw Error('code is undefined');
		navigator.clipboard.writeText(code);
		toast('Copied Code to Clipboard');
	}

	function cancel() {
		peer.destroy();
	}
</script>

<div class="flex h-full w-full items-center justify-center">
	<main>
		<form class="flex flex-col gap-2">
			<Label.Root
				for="files"
				role="button"
				class="cursor-pointer rounded-full bg-blue-600 px-6 py-2 text-white drop-shadow-lg duration-300 hover:bg-blue-800"
				>Select Files</Label.Root
			>
			<input
				type="file"
				class="hidden"
				id="files"
				multiple
				required
				onchange={changeHandler}
				bind:this={fileInput}
			/>
		</form>
	</main>
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Dialog.Content class="fixed inset-0 z-50 flex h-full w-full items-center justify-center">
			<div
				class="m-2 flex w-full flex-col items-center rounded-2xl bg-white p-6 break-all drop-shadow-2xl md:m-0 md:w-[40vw]"
			>
				{#if !status}
					<div class="mb-5 w-[30%] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl">
						<QR data={code!} errorCorrectionLevel="H" />
					</div>
					<Dialog.Title class="text-2xl font-bold">Your Transmit Code</Dialog.Title>
					<Dialog.Description class="text-center text-wrap break-all"
						>Ready to send "{fileName}".</Dialog.Description
					>
					<p
						class="mx-10 my-5 flex w-full cursor-copy items-center overflow-x-auto rounded-full border border-gray-200 bg-white px-4 py-3 whitespace-nowrap drop-shadow-lg select-all"
					>
						{code}<Copy
							class="ml-auto h-full cursor-pointer duration-300 hover:text-gray-600"
							role="button"
							size="18"
							onclick={copyCode}
						/>
					</p>
				{:else}
					<Dialog.Title class="text-2xl font-bold">{stage}</Dialog.Title>
					<Dialog.Description class="text-center text-wrap hyphens-auto"
						>{stageDescription}</Dialog.Description
					>
					<Progress.Root
						value={progress}
						class="relative mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-200"
					>
						{#if !error}
							<div
								class="h-full w-full flex-1 bg-black transition-all duration-500 ease-in-out"
								style={`transform: translateX(-${100 - (100 * (progress ?? 0)) / 100}%)`}
							></div>
						{:else}
							<div
								class="h-full w-full flex-1 bg-red-500 transition-all duration-500 ease-in-out"
							></div>
						{/if}
					</Progress.Root>
					{#if !error}
						<p>{status}</p>
					{:else}
						<p class="text-red-700">{error}</p>
					{/if}
				{/if}
				<Dialog.Close
					><Button.Root
						class="mt-5 cursor-pointer rounded-full bg-gray-200 px-6 py-2 duration-300 hover:bg-gray-300"
						onclick={cancel}>Cancel</Button.Root
					></Dialog.Close
				>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
