import { writable, type Writable } from 'svelte/store';

export interface Status {
	sender?: string;
	receiver?: string;
}
export interface Progress {
	sender: number;
	receiver: number;
}

export const passphrase: Writable<string | undefined> = writable<string>();
export const readyDialogOpen: Writable<boolean> = writable<boolean>(false);
export const status: Writable<Status> = writable<Status>({
	sender: undefined,
	receiver: undefined
});
export const progress: Writable<Progress> = writable<Progress>({
	sender: 0,
	receiver: 0
});
