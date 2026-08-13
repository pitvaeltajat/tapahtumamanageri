/** Shared event data model (mirrors server/src/types.ts). */
export interface EventData {
	title: string;
	description: string;
	startsAt: string;
	endsAt: string;
	audience: string;
	registration: string;
	additionalInfo: string;
}

export interface Event extends EventData {
	id: string;
	createdAt: string;
	updatedAt: string;
	googleEventId?: string;
}
