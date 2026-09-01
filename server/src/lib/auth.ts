import { getIronSession, type IronSession } from 'iron-session';
import { decode } from '@auth/core/jwt';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface SessionData {
	/** True when the user has entered the correct admin password. */
	isLoggedIn: boolean;
}

/**
 * The cookie Klapi and Budu issue on `.pitva.fi`.
 *
 * The name is not cosmetic: @auth/core derives the JWE decryption key with
 * HKDF salted by this exact string, so it doubles as the `salt` argument
 * below. It has to match the `cookies.sessionToken.name` those apps configure,
 * character for character, or nothing here decrypts.
 *
 * Deliberately not Auth.js's default `__Secure-authjs.session-token`: Klapi and
 * Budu already had host-scoped cookies under that name, and reusing it for the
 * domain-scoped one left users holding two cookies with a single name.
 */
const SHARED_COOKIE = '__Secure-pitva.session-token';

/** The claims this app cares about; the rest are Klapi's and Budu's own. */
interface SharedClaims {
	email?: string;
	/** Google's verified hosted domain, or null for a personal account. */
	hd?: string | null;
}

/** Pull one cookie out of the request without pulling in cookie-parser. */
function readCookie(req: Request, name: string): string | undefined {
	const header = req.headers.cookie;
	if (!header) return undefined;
	for (const part of header.split(';')) {
		const eq = part.indexOf('=');
		if (eq === -1) continue;
		if (part.slice(0, eq).trim() !== name) continue;
		return decodeURIComponent(part.slice(eq + 1).trim());
	}
	return undefined;
}

/**
 * The signed-in member behind the shared pitva.fi cookie, or null.
 *
 * Fails closed at every step — no secret configured, no cookie, a cookie that
 * does not decrypt (wrong secret, tampered, expired), no email, or an account
 * outside the Workspace fence all return null rather than throwing, so a bad
 * cookie degrades to "not signed in" instead of a 500.
 *
 * The domain check is repeated here rather than trusted from the issuing app:
 * Klapi deliberately admits pre-Workspace personal Gmail accounts, so "holds a
 * valid pitva.fi session" and "may edit the troop's events" are not the same
 * claim.
 */
export async function readSharedSession(req: Request): Promise<SharedClaims | null> {
	if (!config.sharedAuthSecret) return null;

	const token = readCookie(req, SHARED_COOKIE);
	if (!token) return null;

	let claims: SharedClaims | null;
	try {
		claims = (await decode({
			token,
			secret: config.sharedAuthSecret,
			salt: SHARED_COOKIE,
		})) as SharedClaims | null;
	} catch {
		return null;
	}
	if (!claims?.email) return null;

	if (config.allowedDomains.length) {
		const hd = typeof claims.hd === 'string' ? claims.hd.trim().toLowerCase() : null;
		if (!hd || !config.allowedDomains.includes(hd)) return null;
	}

	return claims;
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

/**
 * Express middleware that requires an authenticated caller.
 *
 * Two ways in, checked in that order:
 *   1. the shared pitva.fi session cookie — a member already signed in to
 *      Klapi or Budu needs to do nothing here, which is the point;
 *   2. the legacy shared admin password held in this app's own iron-session.
 *
 * The password is kept deliberately. It is the only way in when the shared
 * secret is unset (local development), and dropping it in the same change that
 * introduces the cookie would mean a single misconfigured environment variable
 * locks everyone out of the event calendar. Retire it once the shared session
 * has been running in production for a while.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	if (await readSharedSession(req)) {
		next();
		return;
	}

	const session = await getSession(req, res);
	if (!session.isLoggedIn) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	next();
}
