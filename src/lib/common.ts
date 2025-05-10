import type { RefObject } from "react";

/**
 * Handles incoming ICE candidates.
 * @param candidate json encoded ice candidate
 * @param peerConnection webrtc connection to configure
 */
export async function handleIceCandidate(
  candidate: string,
  peerConnection: RefObject<RTCPeerConnection | null>,
): Promise<void> {
  if (!peerConnection.current) throw Error("peer connection cannot be null");
  // Only add ICE candidate if remoteDescription is set
  if (!peerConnection.current.remoteDescription) {
    console.warn("Cannot add ICE candidate: No remoteDescription set yet.");
    return;
  }
  // Parse candidate if it's a string
  let iceCandidate: RTCIceCandidate;
  try {
    iceCandidate =
      typeof candidate === "string" ? JSON.parse(candidate) : candidate;
  } catch (e) {
    console.error("Failed to parse ICE candidate:", e, candidate);
    return;
  }
  try {
    await peerConnection.current.addIceCandidate(iceCandidate);
  } catch (error) {
    console.error("Error adding ICE candidate:", error);
  }
}

/**
 * Sends new ICE candidates to the other peer.
 * @param event ice event containing candidate
 * @param webSocket websocket connection used to communicate with the signaling server
 */
export function handleNewIceCandidate(
  event: RTCPeerConnectionIceEvent,
  webSocket: RefObject<WebSocket | null>,
): void {
  if (!webSocket.current) throw Error("websocket connection cannot be null");
  const candidate = event.candidate;
  if (!candidate) {
    // It's normal for candidate to be null at the end of gathering
    return;
  }
  const message: SignalingMessage = {
    type: "ice-candidate",
    candidate: JSON.stringify(candidate),
  };
  webSocket.current.send(JSON.stringify(message));
}
