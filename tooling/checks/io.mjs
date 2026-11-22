import { createHash } from 'node:crypto';
import {
	closeSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const readJSON = (file) => JSON.parse(readFileSync(file, 'utf8'));
export function writeJSON(file, value) {
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
export function filesUnder(directory) {
	if (!existsSync(directory)) return [];
	const generated = new Set(
		[
			'.artifacts',
			'apps/web/.svelte-kit',
			'apps/web/build',
			'apps/desktop/src-tauri/target',
			'apps/desktop/src-tauri/gen'
		].map((file) => path.resolve(directory, file))
	);
	function walk(current) {
		return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
			const file = path.join(current, entry.name);
			if (['node_modules', '.git'].includes(entry.name) || generated.has(path.resolve(file)))
				return [];
			if (/^\.env(?:\.|$)/.test(entry.name) && !['.env.example', '.env.test'].includes(entry.name))
				return [];
			return entry.isDirectory() ? walk(file) : [file];
		});
	}
	return walk(directory).sort();
}
export async function execute(
	command,
	args,
	{ cwd = process.cwd(), env = {}, timeoutMs = 600000 } = {}
) {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-execute-'));
	const out = path.join(directory, 'stdout'),
		err = path.join(directory, 'stderr');
	const stdoutFd = openSync(out, 'w'),
		stderrFd = openSync(err, 'w');
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...env },
			detached: true,
			stdio: ['ignore', stdoutFd, stderrFd]
		});
		let timedOut = false,
			error = null;
		const timer = setTimeout(() => {
			timedOut = true;
			if (child.pid)
				try {
					process.kill(-child.pid, 'SIGKILL');
				} catch (failure) {
					if (failure.code !== 'ESRCH') error = failure.message;
				}
		}, timeoutMs);
		child.on('error', (failure) => {
			error = failure.message;
		});
		child.on('close', (code, signal) => {
			clearTimeout(timer);
			closeSync(stdoutFd);
			closeSync(stderrFd);
			const result = {
				command,
				args,
				cwd,
				code,
				signal,
				timedOut,
				error,
				stdout: readFileSync(out, 'utf8'),
				stderr: readFileSync(err, 'utf8')
			};
			rmSync(directory, { recursive: true, force: true });
			if (code !== 0 || signal || timedOut || error) reject(new Error(JSON.stringify(result)));
			else resolve(result);
		});
	});
}
