import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AddEventPage from './pages/AddEventPage';
import LoginPage from './pages/LoginPage';
import EventsPage from './pages/EventsPage';
import EditEventPage from './pages/EditEventPage';
import IframePage from './pages/IframePage';

export default function App() {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path='/' element={<AddEventPage />} />
				<Route path='/login' element={<LoginPage />} />
				<Route path='/events' element={<EventsPage />} />
				<Route path='/events/:id/edit' element={<EditEventPage />} />
			</Route>
			<Route path='/iframe' element={<IframePage />} />
		</Routes>
	);
}
