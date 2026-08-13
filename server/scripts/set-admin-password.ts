#!/usr/bin/env -S tsx
import bcrypt from 'bcrypt';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { setAdminPasswordHash } from '../src/lib/dynamodb.js';

async function promptPassword(promptText = 'Salasana: ') {
	const rl = readline.createInterface({ input, output });
	try {
		// Using question hides input only on some terminals; keep simple.
		const pw = await rl.question(promptText);
		return pw.trim();
	} finally {
		rl.close();
	}
}

async function main() {
	try {
		const arg = process.argv[2];
		let password = arg && arg.startsWith('--password=') ? arg.split('=')[1] : arg;

		if (!password) {
			password = await promptPassword('Uusi salasana: ');
			const confirm = await promptPassword('Vahvista salasana: ');
			if (password !== confirm) {
				console.error('Salasanat eivät täsmää');
				process.exit(1);
			}
		}

		if (!password || password.length < 6) {
			console.error('Salasana liian lyhyt (vähintään 6 merkkiä)');
			process.exit(1);
		}

		const saltRounds = 12;
		const hash = await bcrypt.hash(password, saltRounds);

		console.log('Hash generated. Uploading to DynamoDB...');
		await setAdminPasswordHash(hash);
		console.log('Admin password hash saved to database.');
	} catch (err) {
		console.error('Failed to set admin password hash:', err);
		process.exit(1);
	}
}

import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
