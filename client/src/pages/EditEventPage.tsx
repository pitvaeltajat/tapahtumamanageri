import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import EventForm from '../components/EventForm';
import type { Event, EventData } from '../types';

export default function EditEventPage() {
	const { id } = useParams<{ id: string }>();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		api.checkAuth()
			.then((res) => {
				if (!res.isLoggedIn) navigate('/login');
			})
			.catch(() => navigate('/login'));
	}, [navigate]);

	useEffect(() => {
		if (!id) return;
		api.getEvent(id)
			.then(setEvent)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [id]);

	async function handleSubmit(data: EventData) {
		if (!id) return;
		await api.updateEvent(id, data);
		navigate('/events');
	}

	if (loading) return <p>Ladataan...</p>;
	if (error) return <p className='error'>{error}</p>;
	if (!event) return <p>Tapahtumaa ei löytynyt.</p>;

	return (
		<div className='page'>
			<h1>Muokkaa tapahtumaa</h1>
			<EventForm initial={event} submitLabel='Tallenna muutokset' onSubmit={handleSubmit} />
		</div>
	);
}
