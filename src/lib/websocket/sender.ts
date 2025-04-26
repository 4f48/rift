import statuses from '$lib/statuses';
import type { Config, SignalingMessage, Status } from '$lib/types';
import type { Writable } from 'svelte/store';
import { handleIceCandidate, handleNewIceCandidate } from './common';

/**
 * Negotiates a WebRTC connection with the receiver.
 * @param config application config
 * @param passphrase svelte store to write the passphrase to
 * @parap passphraseDialogOpen dialog to open when the passphrase is received
 * @param peerConnection initialized RTCPeerConnection to set up
 * @param webSocket websocket connection to use for negotiation
 */
export function negotiateConnection(
	config: Config,
	passphrase: Writable<string>,
	passphraseDialogOpen: Writable<boolean>,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>,
	webSocket: WebSocket | undefined
): void {
	status.set(statuses.websocket_connecting);
	webSocket = new WebSocket(config.flareAddress);
	webSocket.onopen = () => sendOffer(config, peerConnection, status, webSocket);
	webSocket.onmessage = (messageEvent: MessageEvent) =>
		handleResponses(
			messageEvent,
			passphrase,
			passphraseDialogOpen,
			peerConnection,
			status,
			webSocket
		);
	webSocket.onclose = () => {};
	webSocket.onerror = () => {};
}

/**
 * Sends a connection offer to the signaling server.
 * @param config application config
 * @param peerConnection initialized webrtc connection
 * @param webSocket a working websocket connection
 */
async function sendOffer(
	config: Config,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>,
	webSocket: WebSocket
): Promise<void> {
	status.set(statuses.signaling);

	const offer: RTCSessionDescriptionInit = await peerConnection.createOffer();
	peerConnection.setLocalDescription(offer);

	const sdp: string | undefined = offer.sdp;
	if (!sdp) throw Error('SDP cannot be undefined');
	const message: SignalingMessage = {
		type: 'offer',
		passphraseLength: config.passphraseLength,
		sdp,
	};
	webSocket.send(JSON.stringify(message));
}

/**
 * Handles incoming messages from the signaling server.
 * @param messageEvent message event containing signaling data
 * @param passphrase svelte store to write the passphrase to
 * @parap passphraseDialogOpen dialog to open when the passphrase is received
 * @param peerConnection webrtc connection to configure
 * @param webSocket websocket connection used to communicate with the signaling server
 */
function handleResponses(
	messageEvent: MessageEvent,
	passphrase: Writable<string>,
	passphraseDialogOpen: Writable<boolean>,
	peerConnection: RTCPeerConnection,
	status: Writable<Status | undefined>,
	webSocket: WebSocket
): void {
	const message: SignalingMessage = JSON.parse(messageEvent.data);
	switch (message.type) {
		case 'passphrase':
			passphrase.set(message.passphrase);
			passphraseDialogOpen.set(true);
			status.set(statuses.waiting_for_receiver);
			break;
		case 'answer':
			handleAnswer(peerConnection, message.sdp, webSocket);
			status.set(statuses.webrtc_connecting);
			passphraseDialogOpen.set(false);
			break;
		case 'ice-candidate':
			handleIceCandidate(message.candidate, peerConnection);
	}
}

/**
 * Handles the receiver's answer, sets remote description.
 * @param sdp session description protocol message of the receiver
 * @param peerConnection webrtc connection to configure
 */
function handleAnswer(peerConnection: RTCPeerConnection, sdp: string, webSocket: WebSocket): void {
	const description: RTCSessionDescription = new RTCSessionDescription({
		type: 'answer',
		sdp,
	});
	peerConnection.setRemoteDescription(description);
	peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) =>
		handleNewIceCandidate(event, webSocket);
}
