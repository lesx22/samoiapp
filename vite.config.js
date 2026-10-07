import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import http from 'node:http'

// Custom plugin: proxies /gdoc-proxy/* to docs.google.com and follows all
// cross-domain redirects server-side (Vite's built-in proxy can't do this).
function gdocProxyPlugin() {
  return {
    name: 'gdoc-proxy',
    configureServer(server) {
      server.middlewares.use('/gdoc-proxy', (req, res) => {
        const startUrl = `https://docs.google.com${req.url}`;

        function fetchUrl(url, hops = 0) {
          if (hops > 10) { res.writeHead(500); res.end('Too many redirects'); return; }
          const lib = url.startsWith('https') ? https : http;
          lib.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; JardinPlanner/1.0)',
              'Accept': 'text/plain,text/html,*/*',
            },
          }, response => {
            const { statusCode, headers } = response;
            // Follow redirects across any domain
            if (statusCode >= 300 && statusCode < 400 && headers.location) {
              response.resume();
              fetchUrl(headers.location, hops + 1);
              return;
            }
            res.writeHead(statusCode, {
              'Content-Type': headers['content-type'] || 'text/plain',
              'Access-Control-Allow-Origin': '*',
            });
            response.pipe(res);
          }).on('error', err => {
            res.writeHead(502);
            res.end(err.message);
          });
        }

        fetchUrl(startUrl);
      });
    },
  };
}

// Runs the Vercel function in api/claude.js inside the dev server, so
// `npm run dev` behaves like production without needing `vercel dev`.
function claudeApiPlugin() {
  return {
    name: 'claude-api',
    configureServer(server) {
      server.middlewares.use('/api/claude', async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const request = new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: req.headers,
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        });
        const { POST } = await server.ssrLoadModule('/api/claude.js');
        const response = req.method === 'POST'
          ? await POST(request)
          : new Response('Method not allowed', { status: 405 });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Give the dev-server copy of api/claude.js the same env vars Vercel gives it
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    process.env[key] ??= value;
  }
  return {
    plugins: [react(), gdocProxyPlugin(), claudeApiPlugin()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      // Placeholders so modules that create the Supabase client can load.
      // CI has no .env.local, and tests must never reach the real project.
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    },
  }
})
