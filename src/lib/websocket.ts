import { passphrase } from '$lib/stores';
import type { AnswerMsg, ConnReqMsg, IceCandidateMsg, SignalingMessage } from '$lib/types';
import { handleNewIceCandidate } from './rtc';

/** Contains handler methods for the sender side's WebSocket signaling events */
export class Sender {
	/**
	 * Handler function for WebSocket "open" event. Begins the signaling process by creating the offer and sending in to the signaling server.
	 * @param peerConnection {RTCPeerConnection} - WebRTC connection for data transfer.
	 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
	 */
	public static handleWSopen(peerConnection: RTCPeerConnection, websocket: WebSocket): void {
		peerConnection.createOffer().then((offer: RTCSessionDescriptionInit) => {
			peerConnection.setLocalDescription(offer).then(() => {
				const sdp: string | undefined = offer.sdp;
				if (!sdp) throw Error('SDP is undefined');
				const msg: SignalingMessage = {
					type: 'offer',
					sdp,
					passphraseLength: 6
				};
				websocket.send(JSON.stringify(msg));
			});
		});
	}

	/**
	 * Handler function for WebSocket "message" event. It sets receives and saves the passphrase, processes the receiver's answer, and handles ICE candidates.
	 * @param event {MessageEvent} - The event which corresponds to this function call.
	 * @param peerConnection {RTCPeerConnection} - WebRTC connection for data transfer.
	 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
	 */
	public static handleWSmessage(
		event: MessageEvent,
		peerConnection: RTCPeerConnection,
		websocket: WebSocket
	): void {
		const msg: SignalingMessage = JSON.parse(event.data);
		switch (msg.type) {
			case 'passphrase':
				passphrase.set(msg.passphrase);
				console.debug(msg.passphrase);

				peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) =>
					handleNewIceCandidate(event, msg.passphrase, websocket);
				break;
			case 'answer':
				{
					const sessionDescription: RTCSessionDescription = new RTCSessionDescription({
						type: 'answer',
						sdp: msg.sdp
					});
					peerConnection.setRemoteDescription(sessionDescription);
				}
				break;
			case 'ice-candidate':
				handleIceCandidateMsg(msg, peerConnection);
				break;
			default:
				throw Error('unhandled SignalingMessage type');
		}
	}
}

/** Contains handler methods for the receiver side's WebSocket signaling events */
export class Receiver {
	/**
	 * Handler function for WebSocket "open" event. Begins the signaling process by creating the requesting the sender's offer.
	 * @param passphrase {string} - Passphrase for identifying the sender.
	 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
	 */
	public static handleWSopen(
		passphrase: string,
		peerConnection: RTCPeerConnection,
		websocket: WebSocket
	): void {
		const msg: ConnReqMsg = {
			type: 'connection-request',
			passphrase
		};
		websocket.send(JSON.stringify(msg));
	}

	/**
	 * Handler function for WebSocket "message" event. It sets processes the sender's offer, and handles ICE candidates.
	 * @param event {MessageEvent} - The event which corresponds to this function call.
	 * @param passphrase {string} - Passphrase for identifying the sender.
	 * @param peerConnection {RTCPeerConnection} - WebRTC connection for data transfer.
	 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
	 */
	public static handleWSmessage(
		event: MessageEvent,
		passphrase: string,
		peerConnection: RTCPeerConnection,
		websocket: WebSocket
	): void {
		const msg: SignalingMessage = JSON.parse(event.data);
		switch (msg.type) {
			case 'offer':
				{
					const sessionDescription: RTCSessionDescription = new RTCSessionDescription({
						type: 'offer',
						sdp: msg.sdp
					});
					peerConnection.setRemoteDescription(sessionDescription);

					peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) =>
						handleNewIceCandidate(event, passphrase, websocket);

					peerConnection.createAnswer().then((answer: RTCSessionDescriptionInit) => {
						const sdp = answer.sdp;
						if (!sdp) throw Error('SDP is undefined');
						const msg: AnswerMsg = {
							type: 'answer',
							passphrase,
							sdp
						};
						websocket.send(JSON.stringify(msg));
						peerConnection.setLocalDescription(answer);
					});
				}
				break;
			case 'ice-candidate':
				handleIceCandidateMsg(msg, peerConnection);
				break;
			default:
				throw Error('unhandled SignalingMessage type');
		}
	}
}

/**
 * Handler function for WebSocket "close" event. Processes errors thrown by signaling server, cancels transfer if necessary.
 * @param cancelFunction {(websocket: WebSocket) => void} - Function called when cancelling transfer is necessary.
 * @param event {CloseEvent} - The event which corresponds to this function call.
 * @param websocket {WebSocket} - WebSocket connection with the signaling server.
 */
export function handleWebSocketDisconnection(
	cancelFunction: (websocket: WebSocket) => void,
	event: CloseEvent,
	websocket: WebSocket
): void {
	if (event.code != 1000) {
		console.error(event);
		cancelFunction(websocket);
	}
	console.debug('WebSocket connection closed.');
}

/**
 * Handler function for processing incoming ICE candidates.
 * @param msg {IceCandidateMsg} - Message from signaling server.
 * @param peerConnection {RTCPeerConnection} - WebRTC connection for data transfer.
 */
function handleIceCandidateMsg(msg: IceCandidateMsg, peerConnection: RTCPeerConnection): void {
	const iceCandidate: RTCIceCandidate = JSON.parse(msg.candidate);
	peerConnection.addIceCandidate(iceCandidate);
}
