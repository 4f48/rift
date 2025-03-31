import { writable, type Writable } from 'svelte/store';

export const passphrase: Writable<string | undefined> = writable<string>();
