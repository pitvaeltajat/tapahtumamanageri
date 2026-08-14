import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Layout() {
	const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
	const [navOpen, setNavOpen] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		api.checkAuth()
			.then((res) => setIsLoggedIn(res.isLoggedIn))
			.catch(() => setIsLoggedIn(false));
	}, []);

	async function handleLogout() {
		await api.logout();
		setIsLoggedIn(false);
		setNavOpen(false);
		navigate('/login');
	}

	return (
		<div className='layout'>
			<header className='header'>
				<Link to='/' className='brand'>
					Tapahtumaluoja
				</Link>

				<nav className='nav'>
					<div className={`nav-inner${navOpen ? ' open' : ''}`}>
						<Link to='/' onClick={() => setNavOpen(false)}>
							Lisää tapahtuma
						</Link>
						<Link to='/events' onClick={() => setNavOpen(false)}>
							Tapahtumat
						</Link>
						{isLoggedIn === null ? (
							<span className='nav-placeholder' aria-hidden='true' />
						) : isLoggedIn ? (
							<button
								className='link-button'
								onClick={() => {
									setNavOpen(false);
									handleLogout();
								}}
							>
								Kirjaudu ulos
							</button>
						) : (
							<Link to='/login' onClick={() => setNavOpen(false)}>
								Kirjaudu
							</Link>
						)}
					</div>
				</nav>

				<button
					className={`hamburger${navOpen ? ' is-active' : ''}`}
					aria-label={navOpen ? 'Sulje valikko' : 'Avaa valikko'}
					aria-expanded={navOpen}
					onClick={() => setNavOpen((s) => !s)}
				>
					<span className='hamburger-box'>
						<span className='hamburger-inner' />
					</span>
				</button>
			</header>
			<main className='content'>
				<Outlet />
			</main>
		</div>
	);
}
