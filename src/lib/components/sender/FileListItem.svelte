<script lang="ts">
	import { Button } from 'bits-ui';
	import X from 'phosphor-svelte/lib/X';
	import type { EventHandler } from 'svelte/elements';

	interface Props {
		disabled: boolean;
		fileName: string;
		onclick: EventHandler;
	}
	const { disabled, fileName, onclick }: Props = $props();
</script>

<li class="inline-flex items-center gap-1 rounded-md bg-[var(--teal-5)] px-2 text-nowrap">
	<Button.Root class="group" {disabled} {onclick} type="button">
		<X
			class="cursor-pointer duration-300 group-disabled:cursor-default group-disabled:opacity-50 hover:text-red-500/75 group-disabled:hover:text-[var(--teal-12)]"
		/>
	</Button.Root>
	{fileName}
</li>
