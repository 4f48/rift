<script lang="ts">
	import { preventDefaults } from '$lib/utils';
	import FileArrowUp from 'phosphor-svelte/lib/FileArrowUp';

	interface Props {
		inputRef: HTMLInputElement | undefined;
		onDrop: (e: DragEvent) => void;
	}
	const { inputRef, onDrop }: Props = $props();

	let isDraggingOver: boolean = $state<boolean>(false);
</script>

<label
	aria-controls={inputRef?.id}
	class="flex flex-col items-center rounded-md border border-[var(--teal-6)] px-4 py-8 transition-colors duration-300 {isDraggingOver
		? 'border-solid border-[var(--teal-7)] bg-[var(--teal-3)]/50'
		: 'border-dashed'}"
	for={inputRef?.id}
	ondragenter={(e: Event) => {
		preventDefaults(e);
		isDraggingOver = true;
	}}
	ondragleave={(e: Event) => {
		preventDefaults(e);
		isDraggingOver = false;
	}}
	ondragover={(e: Event) => {
		preventDefaults(e);
		isDraggingOver = true;
	}}
	ondrop={(e: DragEvent) => {
		preventDefaults(e);
		onDrop(e);
		isDraggingOver = false;
	}}
>
	<FileArrowUp class="mb-4 size-16 text-[var(--teal-10)]" aria-hidden={true} />
	<p class="mb-2">Drop files here or</p>
	<span
		class="inline-flex min-w-32 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--teal-3)] px-4 py-2 text-[var(--teal-11)] duration-300 hover:bg-[var(--teal-4)]"
		>Browse</span
	>
</label>
