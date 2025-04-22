<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { cva, type VariantProps } from 'class-variance-authority';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const variants = cva(
		'inline-flex min-w-32 disabled:cursor-not-allowed cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 duration-300',
		{
			variants: {
				variant: {
					primary:
						'bg-[var(--teal-5)] text-[var(--teal-12)] hover:bg-[var(--teal-4)] disabled:bg-[var(--gray-4)] disabled:text-[var(--gray-11)]',
					secondary:
						'bg-[var(--teal-3)] text-[var(--teal-11)] hover:bg-[var(--teal-4)] disabled:bg-[var(--teal-4)]',
					outlined:
						'border border-[var(--teal-6)] bg-[var(--teal-2)] text-[var(--teal-12)] hover:bg-[var(--teal-3)] disabled:text-[var(--teal-11)] disabled:bg-[var(--teal-3)]',
				},
			},
			defaultVariants: {
				variant: 'primary',
			},
		}
	);

	type Props = {
		children: Snippet;
		variant?: VariantProps<typeof variants>['variant'];
	} & HTMLButtonAttributes;
	const { children, variant, ...others }: Props = $props();
</script>

<Button.Root class={cn(variants({ variant }))} {...others}>{@render children()}</Button.Root>
