<script lang="ts">
	import { Tabs } from 'bits-ui';
	import Send from '$lib/components/Send.svelte';
	import Receive from '$lib/components/Receive.svelte';
</script>

<div class="flex h-full w-full items-center justify-center">
	<main class="border p-4">
		<Tabs.Root value="send">
			<Tabs.List class="flex gap-3 border bg-gray-300 p-1">
				<Tabs.Trigger value="send" class="w-24 p-1 data-[state=active]:bg-white">Send</Tabs.Trigger>
				<Tabs.Trigger value="receive" class="w-24 p-1 data-[state=active]:bg-white"
					>Receive</Tabs.Trigger
				>
			</Tabs.List>
			<Tabs.Content value="send"><Send /></Tabs.Content>
			<Tabs.Content value="receive"><Receive /></Tabs.Content>
		</Tabs.Root>
	</main>
</div>
