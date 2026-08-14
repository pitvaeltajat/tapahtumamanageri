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

	const urlRegex =
		/(https?:\/\/[^\s<>"]+|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#][^\s<>"]*)?)/gi;
	const parts: Array<string | { href: string; label: string }> = [];
	let lastIndex = 0;

	for (const match of value.matchAll(urlRegex)) {
		const url = match[0];
		const index = match.index ?? 0;

		if (index > lastIndex) {
			parts.push(value.slice(lastIndex, index));
		}

		// Email addresses get a mailto: link; everything else is a web URL.
		const isEmail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(url);
		const href = isEmail ? `mailto:${url}` : /^https?:\/\//i.test(url) ? url : `https://${url}`;
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

	const sameDay =
		start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

	if (sameDay) {
		return formatDate(startsAt);
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

/**
 * Format an event's date range for the iframe view.
 *
 * - Single-day allDay events: "30.8.2026"
 * - Single-day timed events: "30.8.2026 klo 10:00–12:00"
 * - Multi-day events: range as before (no times)
 */
export function formatIframeEventDate(startsAt: string, endsAt: string, allDay: boolean): string {
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return `${startsAt} - ${endsAt}`;
	}

	const sameDay =
		start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

	if (allDay && sameDay) {
		return formatDate(startsAt);
	}

	if (!allDay && sameDay) {
		const dateStr = formatDate(startsAt);
		const startTime = start.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
		const endTime = end.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
		return `${dateStr} klo ${startTime}\u2013${endTime}`;
	}

	return formatEventDateRange(startsAt, endsAt);
}
