<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../app.css';
	import '../new.css';
	import Sparkle from 'phosphor-svelte/lib/Sparkle';
	import Link from '$lib/components/Link.svelte';

	let { children } = $props();
</script>

<header
	class="fixed top-0 z-100 flex h-12 w-screen items-center justify-center bg-[var(--teal-1)]/75 px-6 backdrop-blur-sm md:justify-start"
>
	<a href="/" class="group flex gap-1 font-serif text-2xl">
		<Sparkle class="size-7 text-[var(--teal-10)] duration-150" />
		<span class="text-[var(--teal-12)] duration-150 group-hover:text-[var(--teal-10)]">Rift</span>
	</a>
	<nav class="hidden h-full flex-1 items-center justify-end gap-3 self-end md:flex">
		<Link href="/app" variant="pill">Online</Link>
		<Link href="/download" variant="pill">Download</Link>
	</nav>
</header>
<main class="text-[var(--teal-12)]">
	{@render children()}
</main>

<Toaster position="bottom-center" richColors />
