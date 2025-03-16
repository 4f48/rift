<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../app.css';

	let { children } = $props();
</script>

<div class="fixed top-0 left-0 flex gap-5">
	<a href="/">Home</a>
	<a href="/test">Test Page</a>
	<a href="/send">SendV2</a>
	<a href="/receive">ReceiveV2</a>
</div>
<Toaster />
{@render children()}
