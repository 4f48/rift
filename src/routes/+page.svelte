<script lang="ts">
	import Globe from 'phosphor-svelte/lib/Globe';
	import Download from 'phosphor-svelte/lib/Download';
	import EyeSlash from 'phosphor-svelte/lib/EyeSlash';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import ArrowDown from 'phosphor-svelte/lib/ArrowDown';
	import Speedometer from 'phosphor-svelte/lib/Speedometer';
	import Scales from 'phosphor-svelte/lib/Scales';
	import Link from '$lib/components/Link.svelte';
</script>

<svelte:head>
	<title>Rift | Fast & Secure file transfer</title>
</svelte:head>

<div class="*:h-screen">
	<section class="h-full">
		<div class="flex h-full items-center justify-center bg-[var(--teal-1)]/75">
			<div class="flex flex-col items-center">
				<h1 class="text-center text-6xl font-bold text-[var(--teal-10)]">
					Cost efficient file sharing
				</h1>
				<p class="px-2 text-center text-lg">
					Cryptographically secured and free peer-to-peer file sending powered by open source
					technology.
				</p>
				<div class="mt-3 flex gap-3">
					<Link href="/app" variant="button_primary"><Globe class="size-6" />Try online</Link>
					<Link href="/download" variant="button_outlined"><Download class="size-6" />Download</Link
					>
				</div>
			</div>
			<a href="#security" class="absolute bottom-0 rounded-full p-3">
				<ArrowDown class="hover:text-secondary size-5 text-[var(--teal-10)] duration-150" />
			</a>
		</div>
	</section>
	<section class="flex flex-col">
		<h2 class="p-3 pt-15 text-3xl font-bold" id="security">Private and Secure</h2>
		<div class="flex flex-1 flex-col *:flex *:flex-1 *:items-center *:justify-center md:flex-row">
			<div>
				<ul class=" text-md m-7 flex list-disc flex-col gap-3 md:m-0 md:text-lg">
					<li>True randomly generated transfer codes</li>
					<li>End-to-end encrypted WebRTC tunnels</li>
					<li>Secured by state-of-the-art cryptographic algorithms</li>
					<li>Powered by audited libraries</li>
					<li>Serverless architecture: file transfers are P2P</li>
				</ul>
			</div>
			<div class="text-background *:absolute *:size-50 *:drop-shadow-2xl lg:*:size-75">
				<EyeSlash class="text-accent -translate-x-15 -translate-y-15" />
				<LockKey class="text-secondary translate-x-15 translate-y-10 md:translate-y-15" />
			</div>
		</div>
	</section>
	<section class=" flex flex-col">
		<h2 class="p-3 pt-15 text-3xl font-bold md:text-right" id="performance">Fast and Reliable</h2>
		<div
			class="flex flex-1 flex-col *:flex *:flex-1 *:items-center *:justify-center md:flex-row-reverse"
		>
			<div>
				<ul class=" text-md flex list-disc flex-col gap-3 md:text-lg">
					<li>Optimized for performance</li>
					<li>Works with large files</li>
					<li>Uses reliable WebRTC tunnels</li>
					<li>Transfers through LAN on the same network</li>
					<li class="text-primary">Support for TURN relays coming soon</li>
				</ul>
			</div>
			<div class="text-background *:absolute *:size-50 *:drop-shadow-2xl lg:*:size-75">
				<Scales class="text-secondary -translate-x-15 -translate-y-15" />
				<Speedometer
					class="translate-x-15 translate-y-10 text-[hsl(189,53%,84%)] lg:translate-y-15"
				/>
			</div>
		</div>
	</section>
</div>
