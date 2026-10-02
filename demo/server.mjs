// Development server that renders the demo on the server and hydrates it in
// the browser. Run `pnpm build` first, then `node demo/server.mjs`.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer as createViteServer } from 'vite';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(demoDir, '..');
const host = process.env.HOST ?? 'localhost';
const port = Number(process.env.PORT ?? 5173);

// The demo imports the published entry points, so the packages must be built.
const packages = {
  '@react-overlay-manager/core': path.join(
    rootDir,
    'packages/core/dist/index.js'
  ),
  '@react-overlay-manager/devtools': path.join(
    rootDir,
    'packages/devtools/dist/index.js'
  ),
};
const missing = Object.entries(packages).filter(
  ([, file]) => !existsSync(file)
);
if (missing.length > 0) {
  process.stderr.write(
    `Missing build output for ${missing.map(([name]) => name).join(', ')}. Run \`pnpm build\` first.\n`
  );
  process.exit(1);
}

const httpServer = createHttpServer();
const vite = await createViteServer({
  root: demoDir,
  configFile: false,
  appType: 'custom',
  plugins: [react()],
  resolve: { alias: packages },
  server: { middlewareMode: true, hmr: { server: httpServer } },
});

async function renderPage(req, res) {
  const url = req.url ?? '/';
  if (req.method !== 'GET' || new URL(url, 'http://demo').pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  try {
    const template = await vite.transformIndexHtml(
      url,
      await readFile(path.join(demoDir, 'index.html'), 'utf8')
    );
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
    const html = template.replace('<!--app-html-->', render());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    process.stderr.write(`${error?.stack ?? error}\n`);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  }
}

httpServer.on('request', (req, res) => {
  vite.middlewares(req, res, () => renderPage(req, res));
});

httpServer.listen(port, host, () => {
  process.stdout.write(`Demo running at http://${host}:${port}/\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await vite.close();
    httpServer.close(() => process.exit(0));
  });
}
