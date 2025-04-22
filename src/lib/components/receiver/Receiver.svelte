<script lang="ts">
	import ActionButton from '$lib/components/ActionButton.svelte';
	import Input from '$lib/components/Input.svelte';
	import { preventDefaults } from '$lib/utils';
	import { Label } from 'bits-ui';
	import Progress from '$lib/components/Progress.svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { Status } from '$lib/types';
	import statuses from '$lib/statuses';
	import config from '$lib/config';
	import { negotiateConnection } from '$lib/websocket/receiver';
	import { receiveFile } from '$lib/webrtc/receiver';

	const status: Writable<Status | undefined> = writable<Status | undefined>(undefined);

	let passphrase: string = $state<string>('');

	let webSocket: WebSocket | undefined;
	let peerConnection: RTCPeerConnection | undefined = $state<RTCPeerConnection | undefined>(
		undefined
	);

	function transferFiles(event: SubmitEvent): void {
		preventDefaults(event);

		$status = statuses.initializing;
		peerConnection = new RTCPeerConnection({
			iceServers: config.stunServers,
		});

		negotiateConnection(config, passphrase, peerConnection, webSocket);

		receiveFile(config, peerConnection, status);
	}
</script>

<form class="mx-1 flex flex-col gap-2" onsubmit={transferFiles}>
	<Label.Root for="passphrase">Passphrase</Label.Root>
	<Input
		autocapitalize="off"
		autocomplete="off"
		autocorrect="off"
		bind:value={passphrase}
		disabled={$status ? true : false}
		id="passphrase"
		name="passphrase"
		placeholder="paste-your-passphrase-here"
		required
	/>
	<ActionButton disabledCondition={passphrase} {peerConnection} {status} {webSocket} />
	<Progress {status} />
</form>
