import { z } from 'zod';

/** Validation for event data submitted by the client. */
export const eventSchema = z.object({
	title: z.string().min(1, 'Otsikko on pakollinen'),
	description: z.string().default(''),
	startsAt: z.string().min(1, 'Alkamisaika on pakollinen'),
	endsAt: z.string().min(1, 'Päättymisaika on pakollinen'),
	audience: z.string().default(''),
	registration: z.string().default(''),
	additionalInfo: z.string().default(''),
});

export type EventInput = z.infer<typeof eventSchema>;
