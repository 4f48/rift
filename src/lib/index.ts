export function handleError(
	cancelFunction: (websocket: WebSocket) => void,
	event: Event,
	websocket: WebSocket
): void {
	console.error(event);
	cancelFunction(websocket);
}
