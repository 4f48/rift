import type { IceCandidateMsg } from './types';

export class Sender {
	public static handleRTCopen(dataChannel: RTCDataChannel, event: Event): void {
		console.debug('RTC connection opened');
		console.debug(dataChannel.label);
		console.debug(event);
	}
	public static handleRTCmessage(dataChannel: RTCDataChannel, event: MessageEvent): void {
		console.debug(event.data);
	}
}

export class Receiver {
	public static handleRTCopen(event: RTCDataChannelEvent): void {
		const dataChannel = event.channel;
		dataChannel.binaryType = 'arraybuffer';
		dataChannel.onmessage = (event: MessageEvent) => this.handleRTCmessage(event);
	}
	public static handleRTCmessage(event: MessageEvent): void {
		console.debug(event.data);
	}
}

/**
 * Handler function for WebRTC "icecandidate" event. Sends ICE candidate to the signaling server.
 * @param event {RTCPeerConnectionIceEvent} - The event which corresponds to this function call.
 * @param passphrase {string} - Passphrase for identifying the other peer.
 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
 */
export function handleNewIceCandidate(
	event: RTCPeerConnectionIceEvent,
	passphrase: string,
	websocket: WebSocket
): void {
	const candidate: RTCIceCandidate | null = event.candidate;
	if (candidate) {
		const msg: IceCandidateMsg = {
			type: 'ice-candidate',
			candidate: JSON.stringify(candidate),
			passphrase
		};
		websocket.send(JSON.stringify(msg));
	}
}
