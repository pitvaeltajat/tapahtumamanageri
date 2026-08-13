import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/src/app.js';

const app = createApp();

/**
 * Vercel serverless handler. Vercel auto-detects the `api/` directory and
 * routes all requests here. The Express app handles both the /api routes and
 * serving the built React client.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
	return app(req, res);
}