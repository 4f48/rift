<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import Download from 'phosphor-svelte/lib/Download';
	import { handleWebSocketDisconnection, Receiver as WSreceiver } from '$lib/websocket';
	import { Receiver as RTCreceiver } from '$lib/rtc';
	import { handleError } from '$lib';

	let websocket: WebSocket;
	let disabled = $state<boolean>();

	function cancel() {
		try {
			websocket.close();
		} catch (e) {
			if (e instanceof Error) console.error(e);
		}
		disabled = false;
	}

	let passphrase = $state<string>();
	async function receive(event: SubmitEvent, passphrase: string) {
		event.preventDefault();
		disabled = true;

		const peerConnection = new RTCPeerConnection({
			iceServers: [
				{ urls: 'stun:stun.cloudflare.com:3478' },
				{ urls: 'stun:stun.cloudflare.com:53' }
			]
		});
		peerConnection.ondatachannel = (event: RTCDataChannelEvent) => RTCreceiver.handleRTCopen(event);

		websocket = new WebSocket('ws://0.0.0.0:8080');
		websocket.onopen = () => WSreceiver.handleWSopen(passphrase, peerConnection, websocket);
		websocket.onmessage = (event: MessageEvent) =>
			WSreceiver.handleWSmessage(event, passphrase, peerConnection, websocket);
		websocket.onclose = (event: CloseEvent) =>
			handleWebSocketDisconnection(cancel, event, websocket);
		websocket.onerror = (event: Event) => handleError(cancel, event, websocket);
	}
</script>

<h1 class="m-2 flex items-center gap-2 text-xl"><Download class="size-6" />Receive Files</h1>
<form class="flex flex-col gap-2 px-6" onsubmit={(e: SubmitEvent) => receive(e, passphrase!)}>
	<Label.Root for="passphrase">Passphrase</Label.Root>
	<input
		bind:value={passphrase}
		required
		autocomplete="off"
		autocapitalize="off"
		class="border-primary focus:border-secondary rounded-sm border font-mono placeholder:text-gray-400 focus:ring-0 disabled:bg-gray-300 disabled:text-gray-600"
		placeholder="paste-your-passphrase-here"
		id="passphrase"
		{disabled}
	/>
	{#if !disabled}
		<Button.Root
			type="submit"
			class="bg-primary text-background disabled:bg-primary/50 hover:bg-accent mb-4 w-full cursor-pointer rounded-sm py-2 duration-150 disabled:cursor-not-allowed"
			>Begin</Button.Root
		>
	{:else}
		<Button.Root
			type="button"
			onclick={cancel}
			class="border-primary text-text hover:bg-secondary/30 mb-4 w-full cursor-pointer rounded-sm border py-2 duration-150 disabled:cursor-not-allowed"
			>Cancel</Button.Root
		>
	{/if}
</form>
