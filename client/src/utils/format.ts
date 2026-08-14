/** Format an ISO datetime string for display in Finnish locale. */
export function formatDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleString('fi-FI', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/** Format an ISO datetime string as a short date (for the iframe list). */
export function formatDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString('fi-FI', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

export function renderTextWithLinks(value: string): Array<string | { href: string; label: string }> {
	if (!value) return [];

	const urlRegex = /(https?:\/\/[^\s<>"]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#][^\s<>"]*)?)/gi;
	const parts: Array<string | { href: string; label: string }> = [];
	let lastIndex = 0;

	for (const match of value.matchAll(urlRegex)) {
		const url = match[0];
		const index = match.index ?? 0;

		if (index > lastIndex) {
			parts.push(value.slice(lastIndex, index));
		}

		const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
		parts.push({ href, label: url });
		lastIndex = index + url.length;
	}

	if (lastIndex < value.length) {
		parts.push(value.slice(lastIndex));
	}

	return parts;
}

export function formatEventDateRange(startsAt: string, endsAt: string): string {
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return `${startsAt} - ${endsAt}`;
	}

	const sameYear = start.getFullYear() === end.getFullYear();
	const sameMonth = sameYear && start.getMonth() === end.getMonth();

	if (sameMonth) {
		const startText = `${start.getDate()}.`;
		const endText = `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
		return `${startText}-${endText}`;
	}

	const differentYear = start.getFullYear() !== end.getFullYear();
	const startText = differentYear
		? `${start.getDate()}.${start.getMonth() + 1}.${start.getFullYear()}`
		: `${start.getDate()}.${start.getMonth() + 1}.`;
	const endText = differentYear
		? `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`
		: `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;

	return `${startText}-${endText}`;
}
