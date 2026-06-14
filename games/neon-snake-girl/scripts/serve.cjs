const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const net = require('net');

const ROOT = path.join(__dirname, '..', 'dist');
const CANDIDATE_PORTS = [5174, 8888, 3000, 9090, 5500];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  });
  res.end(body);
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

async function pickPort() {
  const envPort = Number(process.env.PORT);
  if (envPort > 0 && await isPortFree(envPort)) return envPort;

  for (const port of CANDIDATE_PORTS) {
    if (await isPortFree(port)) return port;
  }
  return 0;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, 'index.html'), (err2, indexData) => {
        if (err2) {
          send(res, 404, 'Not Found');
          return;
        }
        send(res, 200, indexData, MIME['.html']);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

pickPort().then((port) => {
  if (!port) {
    console.error('没有可用端口，请关闭其他程序后重试。');
    process.exit(1);
  }

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log('');
    console.log('  锈带纪元 已启动');
    console.log('  请在浏览器打开:', url);
    console.log('  按 Ctrl+C 停止服务器');
    console.log('');
    exec(`start "" "${url}"`);
  });
});

server.on('error', (err) => {
  console.error('服务器启动失败:', err.message);
  process.exit(1);
});
