<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { Status } from '$lib/types';
	import { cancel } from '$lib/utils';
	import type { Writable } from 'svelte/store';

	interface Props {
		disabledCondition: File[] | string;
		peerConnection: RTCPeerConnection | undefined;
		status: Writable<Status | undefined>;
		webSocket: WebSocket | undefined;
	}
	const { disabledCondition, peerConnection, status, webSocket }: Props = $props();
</script>

{#if !$status}
	<Button type="submit" disabled={disabledCondition.length <= 0}>Begin Transfer</Button>
{:else}
	<Button variant="outlined" type="button" onclick={() => cancel(peerConnection, status, webSocket)}
		>Cancel</Button
	>
{/if}
