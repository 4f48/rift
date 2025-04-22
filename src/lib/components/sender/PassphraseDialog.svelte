<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Writable } from 'svelte/store';
	import Button from '../Button.svelte';

	interface Props {
		cancel: () => void;
		open: Writable<boolean>;
		passphrase: Writable<string>;
	}
	const { cancel, open, passphrase }: Props = $props();
</script>

<Dialog.Root bind:open={$open}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-200 bg-[var(--gray-12)]/80" />
		<Dialog.Content
			class="fixed top-[50%] left-[50%] z-200 flex w-[40vw] translate-x-[-50%] translate-y-[-50%] flex-col gap-2 rounded-2xl bg-[var(--teal-1)] p-5 text-[var(--teal-12)]"
			escapeKeydownBehavior="ignore"
			interactOutsideBehavior="ignore"
		>
			<Dialog.Title class="text-2xl font-bold">Your Passphrase</Dialog.Title>
			<Dialog.Description>Share this code with the receiver.</Dialog.Description>
			<span
				class="scroll mt-2 min-w-32 overflow-auto rounded-lg border border-[var(--teal-6)] bg-[var(--teal-2)] px-4 py-2 text-nowrap select-all [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>{$passphrase}</span
			>
			<Button
				variant="outlined"
				onclick={() => {
					$open = false;
					cancel();
				}}>Cancel</Button
			>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
