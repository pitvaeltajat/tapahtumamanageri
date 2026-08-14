import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getSession, requireAuth } from './lib/auth.js';
import * as db from './lib/dynamodb.js';
import * as calendar from './lib/calendar.js';
import { eventSchema } from './validation.js';

/** Create and configure the Express application. */
export function createApp(): express.Express {
	const app = express();

	app.use(
		cors({
			origin: true,
			credentials: true,
		}),
	);
	app.use(express.json());

	// Serve the built React client (client/dist) when it exists. In development
	// the Vite dev server proxies /api here instead. On Vercel the working
	// directory and function layout differ, so probe a few candidate paths.
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const candidates = [
		resolve(__dirname, '../../client/dist'),
		resolve(process.cwd(), 'client/dist'),
		resolve(process.cwd(), '../client/dist'),
		resolve(process.cwd(), '../../client/dist'),
	];
	const clientDist = candidates.find((p) => existsSync(p));
	if (clientDist) {
		app.use(express.static(clientDist));
	}

	/** POST /api/auth - verify the admin password and create a session. */
	app.post('/api/auth', async (req, res) => {
		const { password } = req.body ?? {};
		if (typeof password !== 'string' || password.length === 0) {
			res.status(400).json({ error: 'Salasana puuttuu' });
			return;
		}

		try {
			// Verify against the bcrypt hash stored in DynamoDB. There is no
			// cleartext password anywhere in the app or environment.
			const storedHash = await db.getAdminPasswordHash();
			if (!storedHash) {
				res.status(500).json({ error: 'Admin-salasanaa ei ole asetettu' });
				return;
			}

			// Lazy import bcrypt to avoid adding it to startup if unused.
			const bcrypt = await import('bcrypt');
			const valid = await bcrypt.compare(password, storedHash);

			if (!valid) {
				res.status(401).json({ error: 'Väärä salasana' });
				return;
			}

			const session = await getSession(req, res);
			session.isLoggedIn = true;
			await session.save();
			res.json({ ok: true });
		} catch (err) {
			console.error('Auth error:', err);
			res.status(500).json({ error: 'Autentikointi epäonnistui' });
		}
	});

	/** POST /api/auth/logout - destroy the session. */
	app.post('/api/auth/logout', async (req, res) => {
		const session = await getSession(req, res);
		session.destroy();
		res.json({ ok: true });
	});

	/** GET /api/auth - check whether the current session is authenticated. */
	app.get('/api/auth', async (req, res) => {
		const session = await getSession(req, res);
		res.json({ isLoggedIn: session.isLoggedIn === true });
	});

	/** GET /api/events - list all events sorted by start time (public). */
	app.get('/api/events', async (_req, res) => {
		try {
			const events = await db.listEvents();
			res.json(events);
		} catch (err) {
			console.error('Failed to list events:', err);
			res.status(500).json({ error: 'Tapahtumien haku epäonnistui' });
		}
	});

	/** GET /api/events/:id - get a single event (public). */
	app.get('/api/events/:id', async (req, res) => {
		try {
			const event = await db.getEvent(req.params.id);
			if (!event) {
				res.status(404).json({ error: 'Tapahtumaa ei löytynyt' });
				return;
			}
			res.json(event);
		} catch (err) {
			console.error('Failed to get event:', err);
			res.status(500).json({ error: 'Tapahtuman haku epäonnistui' });
		}
	});

	/** POST /api/events - create an event (auth). */
	app.post('/api/events', requireAuth, async (req, res) => {
		const parsed = eventSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Virheellinen syöte' });
			return;
		}

		try {
			const event = await db.createEvent(parsed.data);
			try {
				const googleEventId = await calendar.insertEvent(parsed.data);
				if (!googleEventId) {
					throw new Error('Google Calendar returned no event id.');
				}
				const updated = await db.updateEvent(event.id, parsed.data, googleEventId);
				if (!updated) {
					throw new Error('Failed to save Google Calendar id to database.');
				}
				res.status(201).json(updated);
				return;
			} catch (err) {
				await db.deleteEvent(event.id).catch(() => undefined);
				throw err;
			}
		} catch (err) {
			console.error('Failed to create event:', err);
			res.status(500).json({ error: 'Tapahtuman luonti epäonnistui' });
		}
	});

	/** PUT /api/events/:id - update an event (auth). */
	app.put('/api/events/:id', requireAuth, async (req, res) => {
		const parsed = eventSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Virheellinen syöte' });
			return;
		}

		try {
			const existing = await db.getEvent(req.params.id);
			if (!existing) {
				res.status(404).json({ error: 'Tapahtumaa ei löytynyt' });
				return;
			}

			let googleEventId = existing.googleEventId;
			if (googleEventId) {
				await calendar.updateEvent(googleEventId, parsed.data);
			} else {
				googleEventId = await calendar.insertEvent(parsed.data);
			}

			const event = await db.updateEvent(req.params.id, parsed.data, googleEventId);
			if (!event) {
				throw new Error('Failed to persist updated event.');
			}
			res.json(event);
		} catch (err) {
			console.error('Failed to update event:', err);
			res.status(500).json({ error: 'Tapahtuman päivitys epäonnistui' });
		}
	});

	/** DELETE /api/events/:id - delete an event (auth). */
	app.delete('/api/events/:id', requireAuth, async (req, res) => {
		try {
			const existing = await db.getEvent(req.params.id);
			if (!existing) {
				res.status(404).json({ error: 'Tapahtumaa ei löytynyt' });
				return;
			}

			if (existing.googleEventId) {
				try {
					await calendar.deleteEvent(existing.googleEventId);
				} catch (err) {
					console.error('Google Calendar sync failed on delete:', err);
				}
			}

			await db.deleteEvent(req.params.id);
			res.json({ ok: true });
		} catch (err) {
			console.error('Failed to delete event:', err);
			res.status(500).json({ error: 'Tapahtuman poisto epäonnistui' });
		}
	});

	// SPA fallback: serve index.html for any non-API GET that isn't a real file,
	// so client-side routes (/, /events, /iframe, ...) work after a refresh.
	if (clientDist) {
		app.get('*', (req, res) => {
			if (req.path.startsWith('/api')) {
				res.status(404).json({ error: 'Not found' });
				return;
			}
			res.sendFile(resolve(clientDist, 'index.html'));
		});
	}

	return app;
}
