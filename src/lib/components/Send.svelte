<script lang="ts">
	import { Button, Label, Progress, ScrollArea } from 'bits-ui';
	import Upload from 'phosphor-svelte/lib/Upload';
	import FileArrowUp from 'phosphor-svelte/lib/FileArrowUp';
	import X from 'phosphor-svelte/lib/X';
	import { compressFiles } from '$lib/files';
	import { Sender as RTCsender } from '$lib/rtc';
	import { handleWebSocketDisconnection, Sender as WSsender } from '$lib/websocket';
	import { handleError } from '$lib';

	let websocket: WebSocket;

	let files = $state<File[]>([]);
	let status = $state<string>();
	let progress = $state<number>(0);

	let input = $state<HTMLInputElement>();
	function addFiles(event: Event, input: HTMLInputElement) {
		const fileList = input.files;
		if (!fileList) throw Error('empty FileList');

		for (let i = 0; i < fileList.length; i++) {
			const file = fileList.item(i);
			if (!file) throw Error('out of bounds');
			files.push(file);
		}
	}
	function removeFile(index: number, files: File[]): File[] {
		files.splice(index, 1);
		return files;
	}
	function cancel(websocket: WebSocket) {
		try {
			websocket.close();
		} catch (e) {
			if (e instanceof Error) console.error(e);
		}
		status = undefined;
		progress = 0;
	}

	async function transfer(event: SubmitEvent, files: File[]) {
		status = 'Preparing';
		event.preventDefault();
		progress = 0;

		status = files.length > 1 ? 'Compressing files' : status;
		const file: File = files.length > 1 ? await compressFiles(files) : files[0];
		progress = 10;

		console.debug(file.name);

		const peerConnection = new RTCPeerConnection({
			iceServers: [
				{ urls: 'stun:stun.cloudflare.com:3478' },
				{ urls: 'stun:stun.cloudflare.com:53' }
			]
		});
		const dataChannel = peerConnection.createDataChannel('rift');
		dataChannel.binaryType = 'arraybuffer';
		dataChannel.onmessage = (event: MessageEvent) => RTCsender.handleRTCmessage(dataChannel, event);
		dataChannel.onopen = (event: Event) => RTCsender.handleRTCopen(dataChannel, event);

		websocket = new WebSocket('ws://0.0.0.0:8080');
		websocket.onopen = () => WSsender.handleWSopen(peerConnection, websocket);
		websocket.onmessage = (event: MessageEvent) =>
			WSsender.handleWSmessage(event, peerConnection, websocket);
		websocket.onclose = (event: CloseEvent) =>
			handleWebSocketDisconnection(cancel, event, websocket);
		websocket.onerror = (event: Event) => handleError(cancel, event, websocket);
	}
</script>

<h1 class="m-2 flex items-center gap-2 text-xl"><Upload class="size-6" />Send Files</h1>
<form class="flex flex-col px-6" onsubmit={(e: SubmitEvent) => transfer(e, files)}>
	<Label.Root for="files" class="text-text">Add files</Label.Root>
	<label
		for="files_input"
		id="files"
		class="border-primary *:text-text flex w-full flex-col items-center justify-center rounded-lg border border-dashed p-6"
	>
		<FileArrowUp class="size-10" />
		<p>Drop files here or</p>
		<span
			role="button"
			tabindex="0"
			class="border-primary hover:bg-secondary/30 mt-1 cursor-pointer rounded-sm border px-6 py-1 duration-150"
			>Browse</span
		>
	</label>
	<input
		id="files_input"
		type="file"
		class="hidden"
		multiple
		disabled={status != undefined}
		onchange={(e: Event) => addFiles(e, input!)}
		bind:this={input}
	/>
	{#if files.length > 0}
		<ScrollArea.Root class="my-3 w-full overflow-hidden pb-3" type="auto">
			<ScrollArea.Viewport>
				<ul class="text-background flex gap-2">
					{#each files as file, i (i)}
						<li class="bg-accent py-1/2 flex items-center rounded-full pr-3 text-nowrap">
							<Button.Root
								class="disabled:text-secondary cursor-pointer px-1 duration-150 hover:text-red-300 disabled:cursor-not-allowed"
								disabled={status != undefined}
								onclick={() => {
									files = removeFile(i, files);
								}}><X /></Button.Root
							>{file.name}
						</li>
					{/each}
				</ul>
			</ScrollArea.Viewport>
			<ScrollArea.Scrollbar
				orientation="horizontal"
				class="flex h-2 touch-none rounded-full border-t border-t-transparent bg-gray-200 duration-150 select-none hover:h-2.5"
			>
				<ScrollArea.Thumb class="h-full rounded-full bg-gray-300" />
			</ScrollArea.Scrollbar>
			<ScrollArea.Corner />
		</ScrollArea.Root>
	{:else}
		<p class="text-text my-3">No files added yet</p>
	{/if}
	{#if !status}
		<Button.Root
			type="submit"
			class="bg-primary text-background disabled:bg-primary/50 hover:bg-accent mb-4 w-full cursor-pointer rounded-sm py-2 duration-150 disabled:cursor-not-allowed"
			disabled={files.length == 0}>Begin</Button.Root
		>
	{:else}
		<Button.Root
			type="button"
			onclick={() => cancel(websocket)}
			class="border-primary text-text hover:bg-secondary/30 mb-4 w-full cursor-pointer rounded-sm border py-2 duration-150 disabled:cursor-not-allowed"
			>Cancel</Button.Root
		>
	{/if}
</form>
{#if status}
	<div class="px-6">
		<div class="text-text flex">
			<p id="status" class="flex-1">{status}...</p>
			<p>{progress}%</p>
		</div>
		<Progress.Root
			value={progress}
			max={100}
			aria-labelledby="status"
			class="relative h-2 w-full overflow-hidden rounded-full bg-gray-200"
		>
			<div
				class="bg-secondary h-full w-full flex-1 rounded-full transition-all duration-75 ease-in-out"
				style={`transform: translateX(-${100 - (100 * (progress ?? 0)) / 100}%)`}
			></div>
		</Progress.Root>
	</div>
{/if}
