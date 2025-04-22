<script lang="ts">
	import { Tabs } from 'bits-ui';
	import Sender from '$lib/components/sender/Sender.svelte';
	import Receiver from '$lib/components/receiver/Receiver.svelte';
</script>

<svelte:head>
	<title>Rift | File Transfer online</title>
	<meta
		name="description"
		content="Send and receive files securely with Rift's online file transfer tool."
	/>
</svelte:head>

<div class="flex h-screen items-center justify-center p-4">
	<Tabs.Root
		value="send"
		class="flex w-full max-w-lg flex-col gap-2 rounded-2xl bg-[var(--teal-2)] p-4"
	>
		<Tabs.List
			class="flex gap-1 rounded-xl bg-[var(--teal-1)] p-1 *:flex-1 *:rounded-lg *:py-1 *:text-center *:font-medium *:transition *:hover:bg-[var(--gray-3)] *:data-[state=active]:bg-[var(--teal-6)] *:data-[state=active]:text-white"
			aria-label="File transfer options"
		>
			<Tabs.Trigger value="send">Send</Tabs.Trigger>
			<Tabs.Trigger value="receive">Receive</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="send"><Sender /></Tabs.Content>
		<Tabs.Content value="receive"><Receiver /></Tabs.Content>
	</Tabs.Root>
</div>
