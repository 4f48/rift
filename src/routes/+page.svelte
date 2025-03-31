<script lang="ts">
	import Globe from 'phosphor-svelte/lib/Globe';
	import Download from 'phosphor-svelte/lib/Download';
	import EyeSlash from 'phosphor-svelte/lib/EyeSlash';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import ArrowDown from 'phosphor-svelte/lib/ArrowDown';
	import Speedometer from 'phosphor-svelte/lib/Speedometer';
	import Scales from 'phosphor-svelte/lib/Scales';
</script>

<svelte:head>
	<title>Rift | Fast & Secure file transfer</title>
</svelte:head>

<div class="*:h-screen">
	<section class="flex h-full items-center justify-center">
		<div class="flex flex-col items-center">
			<h1 class="text-primary text-center font-serif text-5xl">Fast & Secure file transfer</h1>
			<p class="text-text px-2 text-center">
				Cryptographically secured and free client-to-client file sending powered by open source
				technology.
			</p>
			<div
				class="mt-3 flex gap-3 *:flex *:cursor-pointer *:items-center *:gap-2 *:rounded-sm *:py-2 *:pr-7 *:duration-150"
			>
				<a href="/app" class="bg-primary text-background hover:bg-accent"
					><Globe class="ml-3 size-6" />Try online</a
				>
				<a href="/download" class="border-primary text-text hover:bg-secondary/30 border"
					><Download class="ml-3 size-6" />Download</a
				>
			</div>
		</div>
		<a href="#security" class="absolute bottom-0 rounded-full p-3">
			<ArrowDown class="text-primary hover:text-secondary size-5 duration-150" />
		</a>
	</section>
	<section class="bg-primary flex flex-col">
		<h2 class="text-background p-3 pt-15 font-serif text-3xl" id="security">Private and Secure</h2>
		<div class="flex flex-1 flex-col *:flex *:flex-1 *:items-center *:justify-center md:flex-row">
			<div>
				<ul class="text-background text-md m-7 flex list-disc flex-col gap-3 md:m-0 md:text-lg">
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
	<section class="bg-accent flex flex-col">
		<h2 class="text-background p-3 pt-15 font-serif text-3xl md:text-right" id="performance">
			Fast and Reliable
		</h2>
		<div
			class="flex flex-1 flex-col *:flex *:flex-1 *:items-center *:justify-center md:flex-row-reverse"
		>
			<div>
				<ul class="text-background text-md flex list-disc flex-col gap-3 md:text-lg">
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
