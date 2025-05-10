import type { RefObject } from "react";
import { handleIceCandidate, handleNewIceCandidate } from "./common";

export async function sendOffer(
  socket: RefObject<WebSocket | null>,
  peerConn: RefObject<RTCPeerConnection | null>,
): Promise<void> {
  if (!peerConn.current) throw Error("peerConn cannot be null");
  const offer = await peerConn.current.createOffer();
  await peerConn.current.setLocalDescription(offer);
  if (!socket.current) throw Error("websocket connection cannot be null");
  const sdp = offer.sdp;
  if (!sdp) throw Error("sdp payload cannot be undefined");
  const message: SignalingMessage = {
    type: "offer",
    passphraseLength: 6,
    sdp,
  };
  socket.current.send(JSON.stringify(message));
}

export async function handleMessage(
  event: MessageEvent<any>,
  channel: RefObject<RTCDataChannel | null>,
  peerConn: RefObject<RTCPeerConnection | null>,
  socket: RefObject<WebSocket | null>,
  onCode: (code: string) => void,
  setStatus: (status: string) => void,
  setCode: React.Dispatch<React.SetStateAction<string | undefined>>,
): Promise<void> {
  if (!peerConn.current) throw Error("peer connection cannot be null");
  // Only parse JSON if event.data is a string (WebSocket signaling)
  if (typeof event.data !== "string") {
    // Ignore non-string messages (e.g., binary data from RTCDataChannel)
    return;
  }
  const message: SignalingMessage = JSON.parse(event.data);
  console.debug(message);
  switch (message.type) {
    case "passphrase":
      onCode(message.passphrase);
      setStatus("Waiting for receiver...");
      break;
    case "answer":
      {
        if (peerConn.current.signalingState !== "have-local-offer") {
          console.warn(
            `Cannot set remote answer in state ${peerConn.current.signalingState}`,
          );
          return;
        }
        const description = new RTCSessionDescription({
          type: "answer",
          sdp: message.sdp,
        });
        await peerConn.current.setRemoteDescription(description);
        peerConn.current.onicecandidate = (event) =>
          handleNewIceCandidate(event, socket);
        setCode(undefined);
      }
      break;
    case "ice-candidate":
      await handleIceCandidate(message.candidate, peerConn);
  }
}
