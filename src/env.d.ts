declare interface OfferMessage {
  type: "offer";
  passphraseLength: number;
  sdp: string;
}

declare interface CodeMessage {
  type: "passphrase";
  passphrase: string;
}

declare interface AnswerMessage {
  type: "answer";
  sdp: string;
}

declare interface IceCandidateMessage {
  type: "ice-candidate";
  candidate: string;
}

declare interface ConnectionRequestMessage {
  type: "connection-request";
  passphrase: string;
}

declare type SignalingMessage =
  | OfferMessage
  | CodeMessage
  | AnswerMessage
  | IceCandidateMessage
  | ConnectionRequestMessage;
