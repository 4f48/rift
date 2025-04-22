import type { SignalingMessage } from '$lib/types';

/**
 * Handles incoming ICE candidates.
 * @param candidate json encoded ice candidate
 * @param peerConnection webrtc connection to configure
 */
export function handleIceCandidate(candidate: string, peerConnection: RTCPeerConnection): void {
	const iceCandidate: RTCIceCandidate = JSON.parse(candidate);
	peerConnection.addIceCandidate(iceCandidate);
}

/**
 * Sends new ICE candidates to the other peer.
 * @param event ice event containing candidate
 * @param webSocket websocket connection used to communicate with the signaling server
 */
export function handleNewIceCandidate(
	event: RTCPeerConnectionIceEvent,
	webSocket: WebSocket
): void {
	const candidate = event.candidate;
	if (!candidate) throw Error('ICE candidate cannot be null');
	const message: SignalingMessage = {
		type: 'ice-candidate',
		candidate: JSON.stringify(candidate),
	};
	webSocket.send(JSON.stringify(message));
}
