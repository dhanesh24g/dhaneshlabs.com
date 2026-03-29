const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const routeMap = {
  '/': 'index.html',
  '/products': 'products.html',
  '/products/league-ledger': 'products/league-ledger.html',
  '/products/code-assistant': 'products/code-assistant.html',
  '/products/dashboard-pro': 'products/dashboard-pro.html',
  '/tools': 'tools.html',
  '/content': 'content.html',
  '/contact': 'contact.html'
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (
    pathname === '/studio' ||
    pathname === '/travel' ||
    pathname === '/apps' ||
    pathname === '/studio.html' ||
    pathname === '/travel.html' ||
    pathname === '/apps.html'
  ) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  if (routeMap[pathname]) {
    sendFile(res, path.join(ROOT, routeMap[pathname]));
    return;
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const absolutePath = path.normalize(path.join(ROOT, relativePath));

  if (!absolutePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, absolutePath);
      return;
    }

    sendFile(res, path.join(ROOT, 'index.html'));
  });
});

server.listen(PORT, () => {
  console.log(`Local server running at http://127.0.0.1:${PORT}`);
});
