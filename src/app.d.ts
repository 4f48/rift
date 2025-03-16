// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	namespace Message {
		export interface MsgBase {
			readonly type: 'file_meta' | 'chunk' | 'finish';
		}
		export class FileMeta implements MsgBase {
			readonly type = 'file_meta';
			constructor(
				public name: string,
				public size: number,
				public lastModified: number,
				public fileType: string
			) {}
		}
		export class Chunk implements MsgBase {
			readonly type = 'chunk';
			constructor(
				public data: string,
				public nonce: string
			) {}
		}
		export class Finish implements MsgBase {
			readonly type = 'finish';
			constructor(public fileHash: string) {}
		}
	}
}

export default global;
