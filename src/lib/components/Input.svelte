<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = {
		value?: string;
	} & HTMLInputAttributes;
	let { value = $bindable(), ...others }: Props = $props();
</script>

<input
	{...others}
	bind:value
	class="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border border-[var(--teal-6)] bg-[var(--teal-2)] px-4 py-2 text-[var(--teal-12)] ring-0 focus:border-[var(--teal-8)] disabled:cursor-not-allowed disabled:bg-[var(--teal-3)] disabled:text-[var(--teal-11)]"
/>
