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

	/**
	 * The session secret shared with Klapi (NEXTAUTH_SECRET) and Budu
	 * (AUTH_SECRET). Set it and this app will accept the pitva.fi session
	 * cookie those two issue, so a member signed in there is signed in here.
	 *
	 * Optional on purpose: unset, the shared-session path is simply switched
	 * off and the admin password below remains the only way in. That keeps
	 * local development and a mis-deploy working rather than locked out.
	 */
	sharedAuthSecret: process.env.AUTH_SECRET,

	/**
	 * Workspace domains allowed through the shared session, comma-separated.
	 * Checked against the `hd` claim Google asserts, exactly as Budu does it —
	 * an email suffix proves nothing on its own.
	 *
	 * Empty means "any account that can produce a valid pitva.fi session",
	 * which is wider than it sounds only if Klapi's legacy personal-Gmail
	 * logins should not reach this app. Set it.
	 */
	allowedDomains: (process.env.GOOGLE_WORKSPACE_DOMAIN ?? '')
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean),
};
