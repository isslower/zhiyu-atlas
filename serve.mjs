import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, 'client', 'dist');
const publicRoot = path.join(root, 'client', 'public');
const port = Number(process.env.PORT || 8080);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function safeResolve(baseRoot, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.resolve(baseRoot, `.${normalized}`);
  if (!resolved.startsWith(path.resolve(baseRoot))) return null;
  return resolved;
}

function hasFileExtension(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  return path.extname(pathname) !== '';
}

const server = http.createServer(async (request, response) => {
  try {
    const url = request.url || '/';
    const baseRoot = url === '/config.json' || url.startsWith('/data/') || url.startsWith('/data-source/')
      ? publicRoot
      : distRoot;
    const filePath = safeResolve(baseRoot, url);
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    let content;
    let finalPath = filePath;
    try {
      content = await fs.readFile(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (hasFileExtension(url)) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      finalPath = path.join(distRoot, 'index.html');
      content = await fs.readFile(finalPath);
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(finalPath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(content);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(String(error?.stack || error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static site running at http://127.0.0.1:${port}/`);
});
