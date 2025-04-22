<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import FileListItem from './FileListItem.svelte';
	import { removeFile } from '$lib/files';
	import type { Writable } from 'svelte/store';
	import type { Status } from '$lib/types';

	interface Props {
		files: File[];
		status: Writable<Status | undefined>;
	}
	const { files, status }: Props = $props();
</script>

{#if files}
	<ScrollArea.Root type="auto">
		<ScrollArea.Viewport class="mb-3">
			<ul class="flex gap-1">
				{#each files as file, i (i)}
					<FileListItem
						disabled={$status ? true : false}
						fileName={file.name}
						onclick={() => removeFile(files, i)}
					/>
				{/each}
			</ul>
		</ScrollArea.Viewport>
		<ScrollArea.Scrollbar
			orientation="horizontal"
			class="flex h-2 touch-none rounded-lg border-t border-t-transparent bg-[var(--gray-3)] duration-150 select-none hover:h-2.5"
		>
			<ScrollArea.Thumb class="h-full rounded-lg bg-[var(--gray-6)]" />
		</ScrollArea.Scrollbar>
		<ScrollArea.Corner />
	</ScrollArea.Root>
{:else}{/if}
