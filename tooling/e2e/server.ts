import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const current = resolve(existsSync('apps/web/build') ? 'apps/web/build' : 'build');
const reference = resolve(process.env.NOTFEED_REFERENCE_BUILD ?? '.artifacts/e2e/reference-build');
let directory = process.env.NOTFEED_UPGRADE === '1' ? reference : current;
const fixtureTime = new Date().toISOString();
const mime: Record<string, string> = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.woff2': 'font/woff2'
};
const server = createServer(async (req, res) => {
	try {
		const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1:4173').pathname);
		if (pathname === '/__test/health') {
			res.end('ok');
			return;
		}
		if (pathname === '/__fixtures/feed.json') {
			const fixture: { items: { date_published: string }[] } = JSON.parse(
				await readFile('tooling/e2e/fixtures/feed.json', 'utf8')
			);
			for (const item of fixture.items) item.date_published = fixtureTime;
			res.setHeader('content-type', 'application/json');
			res.setHeader('cache-control', 'no-store');
			res.end(JSON.stringify(fixture));
			return;
		}
		if (pathname === '/__test/build' && req.method === 'POST') {
			let body = '';
			for await (const chunk of req) body += chunk;
			const data: { target?: string } = JSON.parse(body);
			if (!['current', 'reference'].includes(data.target ?? '')) {
				res.writeHead(400);
				res.end('invalid target');
				return;
			}
			directory = data.target === 'reference' ? reference : current;
			await stat(`${directory}/index.html`);
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ target: data.target }));
			return;
		}
		if (pathname === '/__fixtures/empty.html') {
			res.setHeader('content-type', 'text/html');
			res.end('<!doctype html><title>Uncontrolled fixture</title>');
			return;
		}
		const root = pathname.startsWith('/__fixtures/') ? resolve('tooling/e2e/fixtures') : directory;
		const relative = pathname.startsWith('/__fixtures/')
			? pathname.slice('/__fixtures/'.length)
			: pathname.slice(1);
		let file = resolve(root, relative || 'index.html');
		if (!file.startsWith(root + sep)) {
			res.writeHead(403);
			res.end('forbidden');
			return;
		}
		try {
			if (!(await stat(file)).isFile()) throw new Error('not file');
		} catch {
			if (extname(pathname) || pathname.startsWith('/__fixtures/')) {
				res.writeHead(404);
				res.end('missing');
				return;
			}
			file = `${directory}/index.html`;
		}
		res.setHeader('cache-control', 'no-store');
		res.setHeader('content-type', mime[extname(file)] ?? 'application/octet-stream');
		res.end(await readFile(file));
	} catch (error) {
		console.error(error);
		res.writeHead(500);
		res.end('test server failure');
	}
});
server.listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
	process.on(signal, () => server.close(() => process.exit(0)));
