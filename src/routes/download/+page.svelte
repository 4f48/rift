<script lang="ts">
	import { Separator } from 'bits-ui';
	import AndroidLogo from 'phosphor-svelte/lib/AndroidLogo';
	import AppleLogo from 'phosphor-svelte/lib/AppleLogo';
	import Heart from 'phosphor-svelte/lib/Heart';
	import HandCoins from 'phosphor-svelte/lib/HandCoins';
	import Link from '$lib/components/Link.svelte';

	const coming_soon = true;
</script>

<svelte:head>
	<title>Rift | Download</title>
</svelte:head>

<div class="flex h-screen w-screen flex-col">
	{#if !coming_soon}
		<h1 class="text-text mt-14 mb-5 w-full text-center font-serif text-3xl">Download clients</h1>
		<div
			class="flex h-full w-full flex-col items-center justify-center gap-8 p-2 pt-0 *:flex *:h-full *:w-full *:flex-1 md:flex-row"
		>
			<div>
				<section
					class="bg-secondary *:text-background flex h-full w-full flex-col items-center rounded-2xl p-2"
				>
					<h2 class="mb-3 flex w-full items-center justify-start gap-2">
						<AndroidLogo class="size-10" />
						<span class="text-2xl font-bold">Android</span>
					</h2>
					<h3 class="flex items-center gap-2 text-center font-bold">
						<Heart weight="bold" class="size-5" />Support us by purchasing:
					</h3>
					<a href="https://play.google.com/store/"
						><img
							alt="Get it on Google Play"
							src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
							class="h-18"
						/></a
					>
					<Separator.Root class="bg-background my-4 h-px w-[calc(100%-3rem)] shrink-0 px-4" />
					<h3 class="flex items-center gap-2 text-center">Download for free:</h3>
					<a href="https://f-droid.org/en/packages/"
						><img alt="Get it on F-Droid" src="/fdroid.png" class="h-18" /></a
					>
					<p>
						or download from <a href="https://github.com/4f48" class="underline">GitHub Releases</a
						>.
					</p>
					<Separator.Root class="bg-background my-4 h-px w-[calc(100%-3rem)] shrink-0 px-4" />
					<h3 class="mb-2 flex items-center gap-2 text-center">
						<HandCoins class="size-5" />Consider donating:
					</h3>
					<a href="https://ko-fi.com"
						><img alt="Support me on Ko-fi" src="/kofi.png" class="h-12" /></a
					>
				</section>
			</div>
			<div>
				<section
					class="bg-secondary *:text-background flex h-full w-full flex-col items-center rounded-2xl p-2"
				>
					<h2 class="mb-3 flex w-full items-center justify-start gap-2">
						<AppleLogo class="size-10" />
						<span class="text-2xl font-bold">iOS</span>
					</h2>
					<h3 class="flex items-center gap-2 text-center font-bold">
						<Heart weight="bold" class="size-5" />Support us by purchasing:
					</h3>
					<a href="https://apps.apple.com" class="mt-2"
						><img alt="Download on App Store" src="/appstore.svg" class="h-12" /></a
					>
					<Separator.Root class="bg-background my-4 h-px w-[calc(100%-3rem)] shrink-0 px-4" />
					<h3 class="flex items-center gap-2 text-center">Download for free:</h3>
					<a href="https://github.com/4f48" class="underline">GitHub Releases</a>
				</section>
			</div>
		</div>
	{:else}
		<div class="flex h-full w-full flex-col items-center justify-center gap-2">
			<h1 class="text-xl font-bold">Android & iOS apps coming soon.</h1>
			<Link href="/" variant="pill">Go back</Link>
		</div>
	{/if}
</div>
