<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../app.css';
	import Sparkle from 'phosphor-svelte/lib/Sparkle';

	let { children } = $props();
</script>

<header
	class="bg-background/75 fixed top-0 z-100 flex h-12 w-screen items-center justify-center px-6 backdrop-blur-sm md:justify-start"
>
	<a href="/" class="group flex gap-1 font-serif text-2xl">
		<Sparkle class="text-primary group-hover:text-secondary size-7 duration-150" />
		<span class="text-text group-hover:text-secondary duration-150">Rift</span>
	</a>
	<nav
		class="*:text-text *:hover:bg-secondary/30 *:hover:text-primary hidden h-full flex-1 items-center justify-end gap-3 self-end *:w-26 *:rounded-full *:text-center *:duration-150 md:flex"
	>
		<a href="/app">Online</a>
		<a href="/download">Download</a>
	</nav>
</header>
<main>
	{@render children()}
</main>

<Toaster />
