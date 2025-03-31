<script lang="ts">
	import Send from '$lib/components/Send.svelte';
	import Receive from '$lib/components/Receive.svelte';
</script>

<svelte:head>
	<title>Rift | File Transfer online</title>
</svelte:head>

<div
	class="*:border-primary flex h-[200vh] w-screen flex-col gap-20 overflow-y-scroll p-6 pt-14 *:h-screen *:rounded-2xl *:border md:h-screen md:flex-row md:justify-center md:gap-6 *:md:h-full *:md:w-[45%] *:md:max-w-[45%]"
>
	<div class="*:text-text"><Send /></div>
	<div class="*:text-text"><Receive /></div>
</div>
