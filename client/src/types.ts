/** Shared event data model (mirrors server/src/types.ts). */
export interface EventData {
	title: string;
	description: string;
	startsAt: string;
	endsAt: string;
	audience: string;
	organizer: string;
	registration: string;
	additionalInfo: string;
	allDay: boolean;
}

export interface Event extends EventData {
	id: string;
	createdAt: string;
	updatedAt: string;
	googleEventId?: string;
}

/** Selectable options for the "Taho" (organizer) field. */
export const ORGANIZER_OPTIONS = [
	'PitVa',
	'Järeä',
	'Espoon Partiotuki',
	'Pääkaupunkiseudun Partiolaiset',
	'Suomen Partiolaiset',
	'Muu',
] as const;
