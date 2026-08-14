import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless handler. Vercel auto-detects the `api/` directory and
 * routes all requests here. The Express app handles both the /api routes and
 * serving the built React client.
 *
 * The server is compiled to an ES Module (server/package.json has "type":
 * "module"), but Vercel bundles this handler as CommonJS, so we must load the
 * app with a dynamic import() rather than a static require().
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
	const { createApp } = await import('../server/dist/app.js');
	const app = createApp();
	return app(req, res);
}
