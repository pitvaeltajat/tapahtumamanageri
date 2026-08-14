import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import type { Event, EventData } from '../types.js';

const client = new DynamoDBClient({ region: config.awsRegion });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = config.dynamoTable;
const PK = 'EVENT';

/** Convert a stored DynamoDB item into an Event. */
function toEvent(item: Record<string, unknown>): Event {
	return {
		id: item.sk as string,
		title: item.title as string,
		description: (item.description as string) ?? '',
		startsAt: item.startsAt as string,
		endsAt: item.endsAt as string,
		audience: (item.audience as string) ?? '',
		registration: (item.registration as string) ?? '',
		additionalInfo: (item.additionalInfo as string) ?? '',
		allDay: (item.allDay as boolean) ?? false,
		createdAt: item.createdAt as string,
		updatedAt: item.updatedAt as string,
		googleEventId: item.googleEventId as string | undefined,
	};
}

/** Create a new event in DynamoDB. */
export async function createEvent(data: EventData): Promise<Event> {
	const now = new Date().toISOString();
	const event: Event = {
		id: randomUUID(),
		...data,
		createdAt: now,
		updatedAt: now,
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLE,
			Item: {
				pk: PK,
				sk: event.id,
				...event,
			},
		}),
	);

	return event;
}

/** List all events sorted by start time (ascending). */
export async function listEvents(): Promise<Event[]> {
	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE,
			FilterExpression: 'pk = :pk',
			ExpressionAttributeValues: { ':pk': PK },
		}),
	);

	const events = (result.Items ?? []).map(toEvent);
	events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
	return events;
}

/** Get a single event by id. */
export async function getEvent(id: string): Promise<Event | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLE,
			Key: { pk: PK, sk: id },
		}),
	);

	return result.Item ? toEvent(result.Item) : null;
}

/** Update an existing event. */
export async function updateEvent(id: string, data: EventData, googleEventId?: string): Promise<Event | null> {
	const existing = await getEvent(id);
	if (!existing) return null;

	const updatedAt = new Date().toISOString();
	const updated: Event = {
		...existing,
		...data,
		updatedAt,
		googleEventId: googleEventId ?? existing.googleEventId,
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLE,
			Item: {
				pk: PK,
				sk: id,
				...updated,
			},
		}),
	);

	return updated;
}

/** Delete an event by id. Returns the deleted event or null. */
export async function deleteEvent(id: string): Promise<Event | null> {
	const existing = await getEvent(id);
	if (!existing) return null;

	await docClient.send(
		new DeleteCommand({
			TableName: TABLE,
			Key: { pk: PK, sk: id },
		}),
	);

	return existing;
}

/** Admin password hash storage helpers */
export async function getAdminPasswordHash(): Promise<string | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLE,
			Key: { pk: 'ADMIN', sk: 'PASSWORD' },
		}),
	);
	return (result.Item?.hash as string) ?? null;
}

export async function setAdminPasswordHash(hash: string): Promise<void> {
	await docClient.send(
		new PutCommand({
			TableName: TABLE,
			Item: {
				pk: 'ADMIN',
				sk: 'PASSWORD',
				hash,
			},
		}),
	);
}
