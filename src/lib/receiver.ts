import type { RefObject } from "react";
import { handleIceCandidate, handleNewIceCandidate } from "./common";

export function requestConnection(
  passphrase: string,
  socket: RefObject<WebSocket | null>,
): void {
  if (!socket.current) throw Error("websocket cannot be null");
  const message: SignalingMessage = {
    type: "connection-request",
    passphrase,
  };
  socket.current.send(JSON.stringify(message));
}

export async function handleResponses(
  event: MessageEvent,
  peerConn: RefObject<RTCPeerConnection | null>,
  socket: RefObject<WebSocket | null>,
): Promise<void> {
  const message: SignalingMessage = JSON.parse(event.data);
  console.debug(message);
  switch (message.type) {
    case "offer": {
      if (!peerConn.current) throw Error("peer connection cannot be null");
      const offerMsg = message as OfferMessage;
      const description: RTCSessionDescription = new RTCSessionDescription({
        type: "offer",
        sdp: offerMsg.sdp,
      });
      await peerConn.current.setRemoteDescription(description);

      peerConn.current.onicecandidate = (event: RTCPeerConnectionIceEvent) =>
        handleNewIceCandidate(event, socket);

      const answer = await peerConn.current.createAnswer();
      if (!peerConn.current || !socket.current)
        throw Error("peer connection or websocket cannot be null");
      await peerConn.current.setLocalDescription(answer);

      const answerSdp = answer.sdp;
      if (!answerSdp) throw Error("SDP cannot be undefined");
      const answerMessage: SignalingMessage = {
        type: "answer",
        sdp: answerSdp,
      };
      socket.current.send(JSON.stringify(answerMessage));
      break;
    }
    case "ice-candidate":
      await handleIceCandidate(
        (message as IceCandidateMessage).candidate,
        peerConn,
      );
      break;
  }
}
