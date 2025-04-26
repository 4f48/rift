<script lang="ts">
	import { negotiateConnection } from '$lib/websocket/sender';
	import { addDroppedFiles, addFiles, processFiles, resetInput } from '$lib/files';
	import DropArea from './DropArea.svelte';
	import ScrollArea from './ScrollArea.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import { writable } from 'svelte/store';
	import type { Status } from '$lib/types';
	import { preventDefaults } from '$lib/utils';
	import config from '$lib/config';
	import statuses from '$lib/statuses';
	import type { Writable } from 'svelte/store';
	import PassphraseDialog from './PassphraseDialog.svelte';
	import { transferFile } from '$lib/webrtc/sender';

	const passphraseDialogOpen: Writable<boolean> = writable<boolean>(false);
	const status: Writable<Status | undefined> = writable<Status | undefined>(undefined);
	const passphrase: Writable<string> = writable<string>('');

	let fileAdder: HTMLInputElement | undefined = $state<HTMLInputElement>();
	let files: File[] = $state<File[]>([]);
	let peerConnection: RTCPeerConnection | undefined = $state<RTCPeerConnection | undefined>(
		undefined
	);
	let webSocket: WebSocket | undefined = $state<WebSocket | undefined>(undefined);

	async function onsubmit(event: SubmitEvent): Promise<void> {
		preventDefaults(event);

		$status = statuses.initializing;
		peerConnection = new RTCPeerConnection({
			iceServers: config.stunServers,
		});
		const dataChannel: RTCDataChannel = peerConnection.createDataChannel(config.channelLabel);
		dataChannel.binaryType = 'arraybuffer';

		negotiateConnection(
			config,
			passphrase,
			passphraseDialogOpen,
			peerConnection!,
			status,
			webSocket
		);

		const file = await processFiles(files);

		transferFile(config, dataChannel, file, status, webSocket!);
	}
</script>

<form class="mx-1 flex flex-col gap-2" {onsubmit}>
	<DropArea
		inputRef={fileAdder}
		onDrop={(e: DragEvent) => {
			addDroppedFiles(e, files);
			resetInput(fileAdder!);
		}}
	/>
	<input
		bind:this={fileAdder}
		class="hidden"
		id="file_adder"
		multiple
		name="file_adder"
		onchange={(e: Event) => {
			addFiles(e, fileAdder, files);
			resetInput(fileAdder!);
		}}
		type="file"
	/>
	<ScrollArea {files} {status} />
	<ActionButton disabledCondition={files} {peerConnection} {status} {webSocket} />
	<Progress {status} />
	<PassphraseDialog
		cancel={() => {
			peerConnection?.close();
			webSocket?.close();
			$status = undefined;
		}}
		open={passphraseDialogOpen}
		{passphrase}
	/>
</form>
