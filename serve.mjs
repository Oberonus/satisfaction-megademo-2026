// Tiny static server for local development, with HTTP Range support
// (the browser needs it to seek in the MP3). Usage: npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const port = Number(process.env.PORT || 8090);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf',
};

http.createServer((req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const { size } = fs.statSync(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': size });
      fs.createReadStream(file).pipe(res);
    }
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
})
  .on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${port} is in use. Try PORT=${port + 1} npm start` : e.message);
    process.exitCode = 1;
  })
  .listen(port, '127.0.0.1', () => console.log(`SATISFACTION → http://localhost:${port}`));
