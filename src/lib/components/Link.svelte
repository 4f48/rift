<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { cva, type VariantProps } from 'class-variance-authority';

	const variants = cva('duration-300', {
		variants: {
			variant: {
				default: 'text-[var(--teal-11)] underline hover:text-[var(--teal-10)]',
				pill: 'inline-flex min-w-24 items-center justify-center rounded-lg px-6 text-[var(--teal-12)] hover:bg-[var(--teal-3)]/50 hover:text-[var(--teal-10)]',
				button_primary:
					'inline-flex min-w-32 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--teal-5)] px-4 py-2 text-[var(--teal-12)] hover:bg-[var(--teal-4)]',
				button_secondary:
					'inline-flex min-w-32 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--teal-3)] px-4 py-2 text-[var(--teal-11)] hover:bg-[var(--teal-4)]',
				button_outlined:
					'inline-flex min-w-32 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--teal-6)] bg-[var(--teal-2)] px-4 py-2 text-[var(--teal-12)] duration-300 hover:bg-[var(--teal-3)]',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	interface Props {
		children: Snippet;
		href?: string;
		variant?: VariantProps<typeof variants>['variant'];
	}
	const { children, href, variant }: Props = $props();
</script>

<a {href} class={cn(variants({ variant }))}>{@render children()}</a>
