export function escapeMdx(value: string | null): string | null {
	// New values are unicode!
	return value?.replace('<', '＜').replace('>', '＞') ?? null;
}
