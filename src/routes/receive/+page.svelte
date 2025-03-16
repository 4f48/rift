<script lang="ts">
	import { Button, Label, Progress } from 'bits-ui';
	import type Message from '../../app';
	import { deriveKey } from '$lib/crypto';
	import { blake3 } from '@noble/hashes/blake3';
	import { bytesToHex } from '@noble/hashes/utils';
	import { hexToBytes } from '@noble/ciphers/utils';
	import Peer from 'peerjs';
	import { xchacha20poly1305 } from '@noble/ciphers/chacha';

	let peer: Peer;

	let code = $state<string>();
	let status = $state<string>();
	let progress = $state<number>();
	let error = $state<string>();

	function isMessage(data: unknown, type: Message.MsgBase) {
		return (
			typeof data == 'object' &&
			data !== null &&
			'type' in data &&
			(data as { type: string }).type === type.type
		);
	}

	async function submithandler(event: SubmitEvent) {
		event.preventDefault();
		if (!code) throw Error('code is required');

		progress = 0;
		error = undefined;

		status = 'Generating keys...';
		progress = 33;
		const hash = bytesToHex(blake3(code));
		const key = await deriveKey(code);

		status = 'Connecting...';
		setTimeout(() => (progress = 66), 100);
		peer = new Peer({
			config: {
				iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }]
			}
		});
		peer.on('open', () => {
			const connection = peer.connect(hash, { reliable: true });
			connection.on('open', () => {
				status = 'Connected. Waiting for transfer...';

				connection.send('ready');

				let metadata: Message.FileMeta;
				let chunks: Message.Chunk[] = [];
				let received = 0;
				connection.on('data', (data: unknown) => {
					if (isMessage(data, { type: 'file_meta' })) {
						metadata = data as Message.FileMeta;
						progress = 0;
						received = 0;
						chunks = [];
						status = `Metadata received.`;
					} else if (isMessage(data, { type: 'chunk' })) {
						chunks.push(data as Message.Chunk);
						received++;
						const estimatedTotalChunks = Math.ceil(metadata.size / (16 * 1024));
						progress = Math.min(100, Math.round((received / estimatedTotalChunks) * 100));
						status = `Transfering: ${progress}%`;
					} else if (isMessage(data, { type: 'finish' })) {
						try {
							status = 'Decrypting file...';
							const decryptedChunks: ArrayBuffer[] = [];

							chunks.forEach((chunk) => {
								const chacha = xchacha20poly1305(key, hexToBytes(chunk.nonce));
								const decryptedChunk = chacha.decrypt(hexToBytes(chunk.data));
								decryptedChunks.push(decryptedChunk.slice().buffer);
							});

							status = 'Finalizing...';
							const file = new File(decryptedChunks, metadata.name, {
								type: metadata.fileType,
								lastModified: metadata.lastModified
							});
							const download = URL.createObjectURL(file);

							const a = document.createElement('a');
							document.body.append(a);
							a.download = file.name;
							a.href = download;
							a.click();
							a.remove();

							status = 'Done!';

							connection.close();
							peer.destroy();

							setTimeout(() => {
								progress = undefined;
								status = undefined;
							}, 300);
						} catch (err) {
							if (err instanceof Error) {
								error = err.message;
								console.error(err);
							}
						}
					}
				});
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
			/>
			<Button.Root
				class="cursor-pointer rounded-full bg-blue-600 px-6 py-2 text-white drop-shadow-lg duration-300 hover:bg-blue-800"
				type="submit">Receive</Button.Root
			>
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
