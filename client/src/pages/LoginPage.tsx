import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginPage() {
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const navigate = useNavigate();

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await api.login(password);
			navigate('/');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Kirjautuminen epäonnistui');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className='page'>
			<h1>Kirjaudu</h1>
			<form className='event-form' onSubmit={handleSubmit}>
				<label>
					Salasana
					<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
				</label>
				{error && <p className='error'>{error}</p>}
				<button type='submit' disabled={submitting}>
					{submitting ? 'Kirjaudutaan...' : 'Kirjaudu'}
				</button>
			</form>
		</div>
	);
}
