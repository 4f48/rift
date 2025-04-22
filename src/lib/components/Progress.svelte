<script lang="ts">
	import type { Status } from '$lib/types';
	import { Progress } from 'bits-ui';
	import type { Writable } from 'svelte/store';

	interface Props {
		status: Writable<Status | undefined>;
	}
	const { status }: Props = $props();
</script>

{#if $status}
	<div class="mx-1 mt-3">
		<div class="flex">
			<p class="flex-1">{$status.message}</p>
			<p>{$status.progress}%</p>
		</div>
		<Progress.Root
			value={$status.progress}
			max={100}
			aria-labelledby="status"
			class="relative h-3 w-full overflow-hidden rounded-lg bg-[var(--gray-3)]"
		>
			<div
				class="h-full w-full flex-1 rounded-lg bg-[var(--teal-7)] transition-all duration-75 ease-in-out"
				style={`transform: translateX(-${100 - (100 * ($status.progress ?? 0)) / 100}%)`}
			></div>
		</Progress.Root>
	</div>
{/if}
