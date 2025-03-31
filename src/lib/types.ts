export interface OfferMsg {
	type: 'offer';
	sdp: string;
	passphraseLength?: number;
}

export interface ConnReqMsg {
	type: 'connection-request';
	passphrase: string;
}

export interface PassphraseMsg {
	type: 'passphrase';
	passphrase: string;
}

export interface AnswerMsg {
	type: 'answer';
	passphrase: string;
	sdp: string;
}

export interface IceCandidateMsg {
	type: 'ice-candidate';
	passphrase?: string;
	candidate: string;
}

export type SignalingMessage = OfferMsg | ConnReqMsg | PassphraseMsg | AnswerMsg | IceCandidateMsg;
