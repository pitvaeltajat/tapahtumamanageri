/**
 * Shared event data model.
 * UI labels are Finnish; code identifiers are English.
 */
export interface EventData {
	/** What? (title) */
	title: string;
	/** Tarkennus (description) */
	description: string;
	/** Alkaa (start) - ISO 8601 */
	startsAt: string;
	/** Loppuu (end) - ISO 8601 */
	endsAt: string;
	/** Kenelle? (audience) */
	audience: string;
	/** Ilmoittautuminen (registration info) */
	registration: string;
	/** Lisätiedot (additional info) */
	additionalInfo: string;
	/** True if this is an all-day event (no start/end time). */
	allDay: boolean;
}

/** A stored event: EventData plus metadata. */
export interface Event extends EventData {
	id: string;
	createdAt: string;
	updatedAt: string;
	/** Google Calendar event id, if synced. */
	googleEventId?: string;
}
