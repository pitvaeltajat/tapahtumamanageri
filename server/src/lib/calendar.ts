import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { config } from '../config.js';
import type { EventData } from '../types.js';

function assertCalendarConfigured() {
	if (!config.googleServiceAccountKey && !config.googleServiceAccountJSON) {
		throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set. Google Calendar sync is disabled.');
	}
	if (!config.googleCalendarId) {
		throw new Error('GOOGLE_CALENDAR_ID is not set. Google Calendar sync is disabled.');
	}
}

/**
 * Google Calendar integration using a service account.
 *
 * Setup:
 * 1. Create a service account in Google Cloud Console and enable the Calendar API.
 * 2. Download the JSON key file and set GOOGLE_SERVICE_ACCOUNT_KEY to its path.
 * 3. Share the target calendar with the service account email (as "Make changes
 *    to events").
 * 4. Set GOOGLE_CALENDAR_ID to the calendar's id (e.g. xxx@group.calendar.google.com).
 */

let calendar: ReturnType<typeof google.calendar> | null = null;

function getCalendar() {
	if (calendar) return calendar;
	assertCalendarConfigured();

	let credentials: { client_email: string; private_key: string };
	if (config.googleServiceAccountJSON) {
		// On Vercel the key is provided inline as a JSON string.
		credentials = JSON.parse(config.googleServiceAccountJSON);
	} else if (config.googleServiceAccountKey?.trim().startsWith('{')) {
		// Defensive: allow GOOGLE_SERVICE_ACCOUNT_KEY to contain the JSON
		// contents directly instead of a file path.
		credentials = JSON.parse(config.googleServiceAccountKey);
	} else {
		const keyPath = config.googleServiceAccountKey!;
		credentials = JSON.parse(readFileSync(keyPath, 'utf8'));
	}

	const auth = new google.auth.JWT({
		email: credentials.client_email,
		key: credentials.private_key,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});

	calendar = google.calendar({ version: 'v3', auth });
	return calendar;
}

// Format the wall-clock parts of a Helsinki-local time so we can compute the
// correct UTC instant via Intl (handles DST transitions accurately).
const helsinkiFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Europe/Helsinki',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});

/** Get the UTC ISO string for a Europe/Helsinki wall-clock time. */
function helsinkiToIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
	// The wall-clock time we want, expressed as if it were UTC.
	const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
	// Convert that back to Helsinki parts (no DST shift applied yet).
	const parts = helsinkiFormatter.formatToParts(new Date(asUtc));
	const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
	const hYear = get('year');
	const hMonth = get('month');
	const hDay = get('day');
	const hHour = get('hour');
	const hMin = get('minute');
	// Difference between the UTC we guessed and the Helsinki wall-clock gives
	// the offset. Subtract it to get the true UTC instant.
	const offsetMs = Date.UTC(hYear, hMonth - 1, hDay, hHour, hMin) - asUtc;
	return new Date(asUtc - offsetMs).toISOString();
}

/** Normalize a stored event timestamp to a valid RFC3339 timestamp for Google Calendar. */
function toGoogleDateTime(value: string): string {
	if (!value) {
		throw new Error('Missing event date/time');
	}

	// The stored value is a local (Europe/Helsinki) wall-clock time like
	// "2026-08-14T10:00" or "2026-08-14". Interpret it in Helsinki time so the
	// resulting UTC instant is correct regardless of the server's timezone.
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
	if (!match) {
		throw new Error(`Unsupported event date/time: ${value}`);
	}

	const [, year, month, day, hours = '00', minutes = '00'] = match;
	return helsinkiToIso(Number(year), Number(month), Number(day), Number(hours), Number(minutes));
}

function formatDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function normalizeDateString(value: string): string {
	const parsed = new Date(value);
	if (!Number.isNaN(parsed.getTime())) {
		return formatDateOnly(parsed);
	}

	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):\d{2})?$/);
	if (!match) {
		throw new Error(`Unsupported event date: ${value}`);
	}

	const [, year, month, day] = match;
	return `${year}-${month}-${day}`;
}

function isMultiDayEvent(data: EventData): boolean {
	const startDateOnly = normalizeDateString(data.startsAt);
	const endDateOnly = normalizeDateString(data.endsAt);
	return startDateOnly !== endDateOnly;
}

/** Build a Google Calendar event resource from our event data. */
function buildEventResource(data: EventData) {
	const description = [
		data.description,
		data.audience ? `Kenelle: ${data.audience}` : '',
		data.registration ? `Ilmoittautuminen: ${data.registration}` : '',
		data.additionalInfo ? `Lisätiedot: ${data.additionalInfo}` : '',
	]
		.filter(Boolean)
		.join('\n\n');

	// All-day events (single or multi-day) use date-only fields.
	if (data.allDay || isMultiDayEvent(data)) {
		const endExclusive = new Date(`${normalizeDateString(data.endsAt)}T00:00:00`);
		endExclusive.setDate(endExclusive.getDate() + 1);

		return {
			summary: data.title,
			description,
			start: { date: normalizeDateString(data.startsAt) },
			end: { date: formatDateOnly(endExclusive) },
		};
	}

	return {
		summary: data.title,
		description,
		start: { dateTime: toGoogleDateTime(data.startsAt), timeZone: 'Europe/Helsinki' },
		end: { dateTime: toGoogleDateTime(data.endsAt), timeZone: 'Europe/Helsinki' },
	};
}

/** Create an event on the Google Calendar. Returns the Google event id. */
export async function insertEvent(data: EventData): Promise<string> {
	const cal = getCalendar();
	assertCalendarConfigured();
	const res = await cal.events.insert({
		calendarId: config.googleCalendarId!,
		requestBody: buildEventResource(data),
	});

	if (res.status < 200 || res.status >= 300 || !res.data.id) {
		throw new Error('Google Calendar did not return a valid event id.');
	}

	return res.data.id;
}

/** Update an existing event on the Google Calendar. */
export async function updateEvent(googleEventId: string, data: EventData): Promise<void> {
	const cal = getCalendar();
	const res = await cal.events.update({
		calendarId: config.googleCalendarId!,
		eventId: googleEventId,
		requestBody: buildEventResource(data),
	});

	if (res.status < 200 || res.status >= 300) {
		throw new Error('Google Calendar update failed.');
	}
}

/** Delete an event from the Google Calendar. */
export async function deleteEvent(googleEventId: string): Promise<void> {
	const cal = getCalendar();
	await cal.events.delete({
		calendarId: config.googleCalendarId!,
		eventId: googleEventId,
	});
}
