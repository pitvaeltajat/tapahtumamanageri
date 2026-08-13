import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import EventForm from '../components/EventForm';
import type { EventData } from '../types';

interface ToastState {
	type: 'success' | 'error';
	message: string;
}

export default function AddEventPage() {
	const [checking, setChecking] = useState(true);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [toast, setToast] = useState<ToastState | null>(null);
	const [formKey, setFormKey] = useState(0);
	const timeoutRef = useRef<number | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		api.checkAuth()
			.then((res) => {
				setIsLoggedIn(res.isLoggedIn);
				if (!res.isLoggedIn) navigate('/login');
			})
			.catch(() => navigate('/login'))
			.finally(() => setChecking(false));
	}, [navigate]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		};
	}, []);

	function showToast(type: ToastState['type'], message: string) {
		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		setToast({ type, message });
		timeoutRef.current = window.setTimeout(() => setToast(null), 4000);
	}

	async function handleSubmit(data: EventData) {
		try {
			await api.createEvent(data);
			showToast('success', 'Tapahtuma lisätty onnistuneesti!');
			setFormKey((prev) => prev + 1);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Tapahtuman luonti epäonnistui';
			showToast('error', message);
			throw err;
		}
	}

	if (checking) return <p>Ladataan...</p>;
	if (!isLoggedIn) return null;

	return (
		<div className='page'>
			<h1>Lisää tapahtuma</h1>
			<EventForm key={formKey} submitLabel='Vahvista tapahtuma' onSubmit={handleSubmit} />
			{toast && (
				<div className='toast-container'>
					<div className={`toast ${toast.type}`} role='status' aria-live='polite'>
						{toast.message}
					</div>
				</div>
			)}
		</div>
	);
}
