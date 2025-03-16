import { scryptAsync } from '@noble/hashes/scrypt';

export async function deriveKey(code: string): Promise<Uint8Array> {
	return scryptAsync(code, '', {
		N: 2 ** 17,
		r: 8,
		p: 1,
		dkLen: 32,
		maxmem: 2 ** 32 + 128 * 8 * 1
	});
}
