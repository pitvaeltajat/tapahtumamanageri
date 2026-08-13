import { getIronSession, type IronSession } from 'iron-session';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface SessionData {
	/** True when the user has entered the correct admin password. */
	isLoggedIn: boolean;
}

export const sessionOptions = {
	cookieName: 'partio-session',
	password: config.sessionSecret,
	ttl: 60 * 60 * 24 * 7, // 7 days
	cookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/',
	},
};

/** Get the iron-session for the current request. */
export async function getSession(req: Request, res: Response): Promise<IronSession<SessionData>> {
	return getIronSession<SessionData>(req, res, sessionOptions);
}

/** Express middleware that requires an authenticated session. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	const session = await getSession(req, res);
	if (!session.isLoggedIn) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	next();
}
