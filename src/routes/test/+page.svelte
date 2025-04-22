<script lang="ts">
	import { getWordList, generateTransmitCode } from '$lib/code';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';
	import Share from 'phosphor-svelte/lib/Share';
	import Link from '$lib/components/Link.svelte';

	let code = $state<string>();
	let length = $state<number>(4);
	let error = $state<string>();

	onMount(generate);

	async function regenerate() {
		generate();
	}

	async function generate() {
		if (length < 1) {
			error = 'length must be at least 1';
			return;
		} else {
			error = undefined;
		}
		const wordList = await getWordList();
		code = await generateTransmitCode(length, wordList);
	}
</script>

<div class="flex h-full w-full justify-center">
	<main>
		<section class="flex flex-col items-center">
			<h2 class="mb-2 text-lg font-bold">generateTransmitCode()</h2>
			<div class="flex flex-col items-start gap-1">
				<label for="code">Transmit Code</label>
				<input
					type="number"
					id="code"
					bind:value={length}
					onchange={regenerate}
					min="1"
					class={{
						'w-[50]': !error,
						'w-[50] border-red-500': error,
					}}
				/>
			</div>
			<p>{code}</p>
			<p
				class={{
					hidden: !error,
					'text-red-500': error,
				}}
			>
				{error}
			</p>
		</section>
	</main>
</div>

<Button><Share />Get started</Button>
<Link href="/" variant="button_outlined">h</Link>
