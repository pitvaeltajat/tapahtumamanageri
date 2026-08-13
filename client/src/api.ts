import type { Event, EventData } from './types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(options?.headers ?? {}),
		},
		...options,
	});

	if (!res.ok) {
		let message = 'Pyyntö epäonnistui';
		try {
			const body = await res.json();
			if (body?.error) message = body.error;
		} catch {
			// ignore - fall back to default message
		}
		throw new Error(message);
	}

	return res.json() as Promise<T>;
}

export const api = {
	/** Verify the admin password and create a session. */
	login: (password: string) =>
		request<{ ok: boolean }>('/auth', {
			method: 'POST',
			body: JSON.stringify({ password }),
		}),

	logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

	/** Check whether the current session is authenticated. */
	checkAuth: () => request<{ isLoggedIn: boolean }>('/auth'),

	listEvents: () => request<Event[]>('/events'),

	getEvent: (id: string) => request<Event>(`/events/${id}`),

	createEvent: (data: EventData) =>
		request<Event>('/events', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	updateEvent: (id: string, data: EventData) =>
		request<Event>(`/events/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		}),

	deleteEvent: (id: string) => request<{ ok: boolean }>(`/events/${id}`, { method: 'DELETE' }),
};
