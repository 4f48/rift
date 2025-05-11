export function sendIceCandidate(
  event: RTCPeerConnectionIceEvent,
  socket: WebSocket,
): void {
  const candidate = event.candidate?.toJSON();

  const msg: SignalingMessage = {
    type: "ice-candidate",
    candidate: candidate ? JSON.stringify(candidate) : undefined,
  };
  socket.send(JSON.stringify(msg));
}
