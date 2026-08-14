import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Event } from '../types';
import { formatDateTime, renderTextWithLinks } from '../utils/format';

export default function EventsPage() {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [showIncomingOnly, setShowIncomingOnly] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		api.checkAuth()
			.then((res) => {
				setIsLoggedIn(res.isLoggedIn);
				if (!res.isLoggedIn) navigate('/login');
			})
			.catch(() => navigate('/login'));
	}, [navigate]);

	useEffect(() => {
		api.listEvents()
			.then(setEvents)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const visibleEvents = showIncomingOnly
		? events.filter((event) => new Date(event.startsAt) > new Date())
		: events;

	async function handleDelete(event: Event) {
		if (!window.confirm(`Poistetaanko tapahtuma "${event.title}"?`)) return;
		try {
			await api.deleteEvent(event.id);
			setEvents((prev) => prev.filter((e) => e.id !== event.id));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Poisto epäonnistui');
		}
	}

	if (loading) return <p>Ladataan...</p>;

	return (
		<div className='page'>
			<h1>Tapahtumat</h1>
			{error && <p className='error'>{error}</p>}
			<label className='filter-toggle'>
				<input
					type='checkbox'
					checked={showIncomingOnly}
					onChange={(e) => setShowIncomingOnly(e.target.checked)}
				/>
				Näytä vain tulevat tapahtumat
			</label>
			{visibleEvents.length === 0 ? (
				<p>Ei tapahtumia.</p>
			) : (
				<ul className='event-list'>
					{visibleEvents.map((event) => (
						<li key={event.id} className='event-card'>
							<div className='event-card-main'>
								<h2>{event.title}</h2>
								<p className='event-time'>
									{formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
								</p>
								{event.description && (
									<p>
										{renderTextWithLinks(event.description).map((part, index) =>
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
									</p>
								)}
								{event.audience && <p>Kenelle: {event.audience}</p>}
								{event.registration && (
									<p>
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
									</p>
								)}
								{event.additionalInfo && (
									<p>
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
									</p>
								)}
							</div>
							{isLoggedIn && (
								<div className='event-card-actions'>
									<Link to={`/events/${event.id}/edit`}>Muokkaa</Link>
									<button className='danger' onClick={() => handleDelete(event)}>
										Poista
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
