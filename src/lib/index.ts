export function truncateString(string: string, maxLength: number): string {
	if (string.length > maxLength) return string.substring(0, maxLength - 3) + '...';
	return string;
}
