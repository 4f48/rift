export async function getWordList(): Promise<Map<string, string>> {
	const response = await fetch('eff_large_wordlist.txt');
	const raw = await response.text();

	const wordlist = new Map();
	raw.split('\n').forEach((line) => {
		const parts = line.split('\t');
		if (parts[0] && parts[1]) wordlist.set(parts[0], parts[1]);
	});

	return wordlist;
}

export function diceRoll(): number {
	const array = new Uint8Array(1);
	crypto.getRandomValues(array);
	return (array[0] % 6) + 1;
}

export async function generateTransmitCode(
	length: number,
	wordlist: Map<string, string>
): Promise<string> {
	const words = [];
	for (let i = 0; i < length; i++) {
		let rolls = 0;
		for (let j = 0; j < 5; j++) {
			rolls += diceRoll() * 10 ** j;
		}

		const word = wordlist.get(rolls.toString());
		if (!word) throw Error('rolls out of range');
		words.push(word);
	}

	return words.join('-');
}
