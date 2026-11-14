import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const publicFiles = new Set(['index.html', 'style.css', 'game.js', 'favicon.svg']);
const server = createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const path = resolve(root, name);
    if (!path.startsWith(root + sep) || !publicFiles.has(name)) { res.writeHead(404); res.end('Non trovato'); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Non trovato'); }
});
server.listen(Number(process.env.PORT) || 5173, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
