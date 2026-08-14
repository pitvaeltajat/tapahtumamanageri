import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

// Load the root .env file (the server runs from the server/ directory).
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
dotenv.config({ path: resolve(projectRoot, '.env') });

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function resolveOptionalPath(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return resolve(projectRoot, value);
}

export const config = {
	port: Number(process.env.PORT ?? 4000),
	sessionSecret: required('SESSION_SECRET'),
	awsRegion: process.env.AWS_REGION ?? 'eu-north-1',
	dynamoTable: process.env.DYNAMODB_TABLE ?? 'partio-tapahtumat',
	googleServiceAccountKey: resolveOptionalPath(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
	googleServiceAccountJSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
	googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
};
