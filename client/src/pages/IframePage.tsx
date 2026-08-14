import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Event } from '../types';
import { formatEventDateRange, renderTextWithLinks } from '../utils/format';

/**
 * Public page intended for embedding in an iframe on another site.
 * Shows events as plain text, sorted by start date. No authentication.
 *
 * Reports its height to the parent window via postMessage so the embedding
 * site can auto-size the iframe. The parent listens for a message with
 * { type: 'pitva-iframe-height', height }.
 */
export default function IframePage() {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const rootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		api.listEvents()
			.then((events) => {
				const now = new Date();
				const incomingEvents = events.filter((event) => new Date(event.startsAt) > now);
				setEvents(incomingEvents);
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	// Report the iframe's content height to the parent so it can auto-size.
	useEffect(() => {
		function reportHeight() {
			const el = rootRef.current;
			if (!el) return;
			const height = Math.ceil(el.getBoundingClientRect().height);
			window.parent.postMessage({ type: 'pitva-iframe-height', height }, '*');
		}

		// Report after render settles, and on resize.
		const id = window.setTimeout(reportHeight, 0);
		window.addEventListener('resize', reportHeight);
		return () => {
			window.clearTimeout(id);
			window.removeEventListener('resize', reportHeight);
		};
	}, [events, loading, error]);

	if (loading) return <p>Ladataan...</p>;
	if (error) return <p className='error'>{error}</p>;

	return (
		<div className='iframe-page' ref={rootRef}>
			{events.length === 0 ? (
				<p>Ei tulevia tapahtumia.</p>
			) : (
				<ul className='iframe-list'>
					{events.map((event) => (
						<li key={event.id} className='iframe-event'>
							<div className='iframe-body'>
								<div className='iframe-title'>{event.title}</div>
								<div className='iframe-date'>{formatEventDateRange(event.startsAt, event.endsAt)}</div>
								{event.description && (
									<div>
										{renderTextWithLinks(event.description).map((part, index) =>
											typeof part === 'string' ? (
												<span key={`text-${index}`}> {part}</span>
											) : (
												<a
													key={`link-${index}`}
													href={part.href}
													target='_blank'
													rel='noopener noreferrer'
												>
													{part.label}
												</a>
											),
										)}
									</div>
								)}
								{event.audience && <div>Kenelle: {event.audience}</div>}
								{event.registration && (
									<div>
										Ilmoittautuminen:{' '}
										{renderTextWithLinks(event.registration).map((part, index) =>
											typeof part === 'string' ? (
												<span key={`text-${index}`}>{part}</span>
											) : (
												<a
													key={`link-${index}`}
													href={part.href}
													target='_blank'
													rel='noopener noreferrer'
												>
													{part.label}
												</a>
											),
										)}
									</div>
								)}
								{event.additionalInfo && (
									<div>
										Lisätiedot:{' '}
										{renderTextWithLinks(event.additionalInfo).map((part, index) =>
											typeof part === 'string' ? (
												<span key={`text-${index}`}>{part}</span>
											) : (
												<a
													key={`link-${index}`}
													href={part.href}
													target='_blank'
													rel='noopener noreferrer'
												>
													{part.label}
												</a>
											),
										)}
									</div>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
