import type { Status } from '$lib/types';
import { type ClassValue, clsx } from 'clsx';
import type { Writable } from 'svelte/store';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for combining class strings.
 * @param inputs Class values to combine
 * @returns Combined class string
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Utility for preventing default browser behavior for an event.
 * @param event event object to handle
 */
export function preventDefaults(event: Event): void {
	event.preventDefault();
	event.stopPropagation();
}

/**
 * Cancels the file transfer.
 * @param webSocket WebSocket connection to close
 * @param peerConnection WebRTC connection to close
 * @param status status to be updated accordingly
 */
export function cancel(
	peerConnection: RTCPeerConnection | undefined,
	status: Writable<Status | undefined>,
	webSocket: WebSocket | undefined
): void {
	if (webSocket) webSocket.close();
	if (peerConnection) peerConnection.close();
	status.set(undefined);
}
