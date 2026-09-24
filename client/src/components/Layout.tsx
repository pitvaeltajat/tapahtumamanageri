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
				<div className='brand-group'>
					<Link to='/' className='brand'>
						Tapahtumaluoja
					</Link>
					{/* Back to the front door. A plain <a> and not a router Link:
					    it leaves the app for another origin. The pill and Lucide's
					    LayoutGrid match Budu and Klapi: "all services", not "back". */}
					<a
						className='uplink'
						href='https://atk.pitva.fi'
						title='Kaikki PitVan palvelut'
					>
						<svg
							viewBox='0 0 24 24'
							width='13'
							height='13'
							fill='none'
							stroke='currentColor'
							strokeWidth='2.25'
							strokeLinecap='round'
							strokeLinejoin='round'
							aria-hidden='true'
							focusable='false'
						>
							<rect width='7' height='7' x='3' y='3' rx='1' />
							<rect width='7' height='7' x='14' y='3' rx='1' />
							<rect width='7' height='7' x='14' y='14' rx='1' />
							<rect width='7' height='7' x='3' y='14' rx='1' />
						</svg>
						ATK
					</a>
				</div>

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
