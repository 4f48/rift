import statuses from '$lib/statuses';
import type { Config, SignalingMessage, Status } from '$lib/types';
import type { Writable } from 'svelte/store';
import { handleIceCandidate, handleNewIceCandidate } from './common';

/**
 * Negotiates a WebRTC connection with the sender.
 * @param config application config
 * @param passphrase passphrase used to identify the sender
 * @param peerConnection initialized RTCPeerConnection to set up
 * @param webSocket websocket connection to use for negotiation
 */
export function negotiateConnection(
	config: Config,
	passphrase: string,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>,
	webSocket: WebSocket | undefined
): void {
	status.set(statuses.websocket_connecting);
	webSocket = new WebSocket(config.flareAddress);
	webSocket.onopen = () => requestConnection(passphrase, status, webSocket);
	webSocket.onmessage = (messageEvent: MessageEvent) =>
		handleResponses(messageEvent, peerConnection, status, webSocket);
	webSocket.onclose = () => {};
	webSocket.onerror = () => {};
}

/**
 * Creates a connection request and sends it to the signaling server.
 * @param passphrase passphrase used to identify the sender
 * @param webSocket websocket connection to send the request over
 */
function requestConnection(
	passphrase: string,
	status: Writable<Status | undefined>,
	webSocket: WebSocket
): void {
	const message: SignalingMessage = {
		type: 'connection-request',
		passphrase,
	};
	webSocket.send(JSON.stringify(message));
	status.set(statuses.requesting);
}

/**
 * Handles incoming messages from the signaling server.
 * @param messageEvent message event containing signaling data
 * @param peerConnection webrtc connection to configure
 * @param webSocket websocket connection for communicating with the signaling server
 */
function handleResponses(
	messageEvent: MessageEvent,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>,
	webSocket: WebSocket
): void {
	const message: SignalingMessage = JSON.parse(messageEvent.data);
	switch (message.type) {
		case 'offer':
			handleOffer(peerConnection, message.sdp, webSocket);
			status.set(statuses.signaling);
			break;
		case 'ice-candidate':
			handleIceCandidate(message.candidate, peerConnection);
	}
}

/**
 * Handles the sender's offer, then creates and sends an answer.
 * @param peerConnection webrtc connection to configure
 * @param offerSdp session description protocol message from the sender
 * @param webSocket websocket connection to send the answer over
 */
async function handleOffer(
	peerConnection: RTCPeerConnection,
	offerSdp: string,
	webSocket: WebSocket
): Promise<void> {
	const description: RTCSessionDescription = new RTCSessionDescription({
		type: 'offer',
		sdp: offerSdp,
	});
	peerConnection.setRemoteDescription(description);

	peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) =>
		handleNewIceCandidate(event, webSocket);

	const answer = await peerConnection.createAnswer();
	peerConnection.setLocalDescription(answer);

	const answerSdp = answer.sdp;
	if (!answerSdp) throw Error('SDP cannot be undefined');
	const message: SignalingMessage = {
		type: 'answer',
		sdp: answerSdp,
	};
	webSocket.send(JSON.stringify(message));
}
