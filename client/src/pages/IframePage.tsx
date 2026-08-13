import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Event } from '../types';
import { formatEventDateRange, renderTextWithLinks } from '../utils/format';

/**
 * Public page intended for embedding in an iframe on another site.
 * Shows events as plain text, sorted by start date. No authentication.
 */
export default function IframePage() {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	if (loading) return <p>Ladataan...</p>;
	if (error) return <p className='error'>{error}</p>;

	return (
		<div className='iframe-page'>
			<h1>Tapahtumat</h1>
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
