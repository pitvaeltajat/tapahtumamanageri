import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import flatpickr from 'flatpickr';
import { Finnish } from 'flatpickr/dist/l10n/fi.js';
import 'flatpickr/dist/flatpickr.css';
import type { EventData } from '../types';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';

interface EventFormProps {
	initial?: EventData;
	submitLabel: string;
	onSubmit: (data: EventData) => Promise<void>;
}

const emptyForm: EventData = {
	title: '',
	description: '',
	startsAt: '',
	endsAt: '',
	audience: '',
	registration: '',
	additionalInfo: '',
	allDay: false,
};

function pad(value: number) {
	return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDateTime(value: string) {
	const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
	return {
		date: match?.[1] ?? '',
		time: match?.[2] ?? '',
	};
}

function makeLocalDateTime(date: string, time: string) {
	return time ? `${date}T${time}` : date;
}

function addOneHour(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	const nextHour = Number.isFinite(hour) ? (hour + 1) % 24 : 11;
	return `${pad(nextHour)}:${pad(Number.isFinite(minute) ? minute : 0)}`;
}

export default function EventForm({ initial, submitLabel, onSubmit }: EventFormProps) {
	const [form, setForm] = useState<EventData>(initial ?? emptyForm);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const dateInputRef = useRef<HTMLInputElement | null>(null);
	const startTimeRef = useRef<HTMLInputElement | null>(null);
	const endTimeRef = useRef<HTMLInputElement | null>(null);
	const fpInstance = useRef<FlatpickrInstance | null>(null);
	const fpStartTime = useRef<FlatpickrInstance | null>(null);
	const fpEndTime = useRef<FlatpickrInstance | null>(null);
	const hasSyncedInitialDate = useRef(false);

	const startDate = parseIsoDateTime(form.startsAt).date;
	const endDate = parseIsoDateTime(form.endsAt).date;
	const sameDay = startDate !== '' && startDate === endDate;

	const startTime = parseIsoDateTime(form.startsAt).time || '10:00';
	const endTime = parseIsoDateTime(form.endsAt).time || (sameDay ? addOneHour(startTime) : '23:59');

	const defaultDateRange = useMemo(() => {
		if (!startDate) return undefined;
		const firstDate = new Date(`${startDate}T00:00`);
		if (!endDate) return firstDate;
		const lastDate = new Date(`${endDate}T00:00`);
		return [firstDate, lastDate];
	}, [startDate, endDate]);

	function update<K extends keyof EventData>(key: K, value: EventData[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function handleDateRangeChange(selectedDates: Date[]) {
		if (selectedDates.length === 0) return;

		const start = selectedDates[0];
		const end = selectedDates[1] ?? selectedDates[0];
		const startDateValue = formatLocalDate(start);
		const endDateValue = formatLocalDate(end);

		if (startDateValue === endDateValue) {
			const startTimeValue = parseIsoDateTime(form.startsAt).time || '10:00';
			const endTimeValue = parseIsoDateTime(form.endsAt).time || addOneHour(startTimeValue);
			update('startsAt', makeLocalDateTime(startDateValue, startTimeValue));
			update('endsAt', makeLocalDateTime(endDateValue, endTimeValue));
			return;
		}

		update('startsAt', makeLocalDateTime(startDateValue, '00:00'));
		update('endsAt', makeLocalDateTime(endDateValue, '23:59'));
	}

	useEffect(() => {
		const el = dateInputRef.current;
		if (!el) return;

		fpInstance.current = flatpickr(el, {
			mode: 'range',
			locale: Finnish,
			dateFormat: 'd.m.Y',
			clickOpens: true,
			allowInput: false,
			onChange: handleDateRangeChange,
			// Open on the current day when no range is selected yet.
			defaultDate: defaultDateRange ?? new Date(),
		}) as FlatpickrInstance;

		return () => fpInstance.current?.destroy();
	}, []);

	useEffect(() => {
		if (!fpInstance.current || !defaultDateRange || hasSyncedInitialDate.current) return;
		fpInstance.current.setDate(defaultDateRange, false);
		hasSyncedInitialDate.current = true;
	}, [defaultDateRange]);

	// Initialize flatpickr time pickers (24-hour format, no AM/PM).
	// The time input fields are always rendered (just hidden via CSS when not
	// applicable), so flatpickr can attach once on mount.
	useEffect(() => {
		if (startTimeRef.current) {
			fpStartTime.current = flatpickr(startTimeRef.current, {
				enableTime: true,
				noCalendar: true,
				dateFormat: 'H:i',
				time_24hr: true,
				locale: Finnish,
				onChange: (selectedDates) => {
					if (selectedDates[0]) handleStartTimeChange(selectedDates[0].toTimeString().slice(0, 5));
				},
			}) as FlatpickrInstance;
		}
		if (endTimeRef.current) {
			fpEndTime.current = flatpickr(endTimeRef.current, {
				enableTime: true,
				noCalendar: true,
				dateFormat: 'H:i',
				time_24hr: true,
				locale: Finnish,
				onChange: (selectedDates) => {
					if (selectedDates[0]) handleEndTimeChange(selectedDates[0].toTimeString().slice(0, 5));
				},
			}) as FlatpickrInstance;
		}

		return () => {
			fpStartTime.current?.destroy();
			fpEndTime.current?.destroy();
		};
	}, []);

	// Keep the flatpickr time pickers in sync with the form values.
	useEffect(() => {
		if (fpStartTime.current && startTime) {
			fpStartTime.current.setDate(startTime, false);
		}
		if (fpEndTime.current && endTime) {
			fpEndTime.current.setDate(endTime, false);
		}
	}, [startTime, endTime]);

	function handleStartTimeChange(value: string) {
		const date = parseIsoDateTime(form.startsAt).date || parseIsoDateTime(form.endsAt).date;
		if (!date) return;
		update('startsAt', makeLocalDateTime(date, value));
	}

	function handleEndTimeChange(value: string) {
		const date = parseIsoDateTime(form.endsAt).date || parseIsoDateTime(form.startsAt).date;
		if (!date) return;
		update('endsAt', makeLocalDateTime(date, value));
	}

	function handleAllDayChange(checked: boolean) {
		update('allDay', checked);
		if (checked) {
			// Full-day: use date-only values (no time).
			const startDateValue = parseIsoDateTime(form.startsAt).date;
			const endDateValue = parseIsoDateTime(form.endsAt).date;
			if (startDateValue) update('startsAt', startDateValue);
			if (endDateValue) update('endsAt', endDateValue);
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await onSubmit(form);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Tapahtui virhe');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form className='event-form' onSubmit={handleSubmit}>
			<label>
				Mitä?
				<input type='text' value={form.title} onChange={(e) => update('title', e.target.value)} required />
			</label>

			<label>
				Tarkennus
				<textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
			</label>

			<label>
				Aika
				<input ref={dateInputRef} type='text' placeholder='Valitse ajanjakso' />
			</label>

			{sameDay && (
				<label className='all-day-toggle'>
					<input type='checkbox' checked={form.allDay} onChange={(e) => handleAllDayChange(e.target.checked)} />
					Koko päivä (ei alkamis- ja päättymisaikaa)
				</label>
			)}

			{/* Time inputs are always rendered (hidden via CSS when not sameDay or allDay)
			    so flatpickr can initialize once on mount. */}
			<div className={`form-row${sameDay && !form.allDay ? '' : ' time-row-hidden'}`}>
				<label className='form-row-item'>
					Alkaa klo
					<input ref={startTimeRef} type='text' placeholder='--:--' />
				</label>
				<label className='form-row-item'>
					Loppuu klo
					<input ref={endTimeRef} type='text' placeholder='--:--' />
				</label>
			</div>

			<label>
				Kenelle?
				<input type='text' value={form.audience} onChange={(e) => update('audience', e.target.value)} />
			</label>

			<label>
				Ilmoittautuminen
				<textarea value={form.registration} onChange={(e) => update('registration', e.target.value)} rows={2} />
			</label>

			<label>
				Lisätiedot
				<textarea value={form.additionalInfo} onChange={(e) => update('additionalInfo', e.target.value)} rows={3} />
			</label>

			{error && <p className='error'>{error}</p>}

			<button type='submit' disabled={submitting}>
				{submitting ? 'Tallennetaan...' : submitLabel}
			</button>
		</form>
	);
}
