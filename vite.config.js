import { defineConfig } from 'vite'
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

export default defineConfig({
  plugins: [react(), gdocProxyPlugin()],
})
