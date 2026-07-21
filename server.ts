import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCommentsRouter } from './server/comments';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html');

    server.set('view engine', 'html');
    server.set('views', browserDistFolder);
    server.set('trust proxy', 1);

    server.use(
        '/api/comments',
        express.json({ limit: '8kb', type: 'application/json' }),
        createCommentsRouter(undefined, join(browserDistFolder, 'posts')),
    );

    // Serve static files from /browser
    server.get('**', express.static(browserDistFolder, {
        maxAge: '1y',
        index: 'index.html',
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                // These files are immutable for a deployment. Give the CDN a
                // short, explicit TTL so Cloudflare can cache the prerendered
                // HTML instead of forwarding every crawler request to Railway.
                res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
            }
            if (filePath.endsWith('robots.txt') || filePath.endsWith('sitemap.xml') || filePath.endsWith('.webmanifest')) {
                res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
            }
            if (filePath.endsWith('.md') || filePath.endsWith('posts.json')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        },
    }));

    // Do not pass missing post assets into Angular SSR, which would return app HTML.
    server.get('/posts/*', (_req, res) => {
        res.status(404).type('text/plain').send('Post not found');
    });

    // All public, indexable routes are prerendered during the build. Serving
    // this shell for anything else (for example, a stale link or admin route)
    // keeps the process from allocating a complete Angular SSR application per
    // request. The Angular router then handles the route in the browser.
    server.get('**', (_req, res) => {
        // Do not let a CDN cache a client-side fallback under an arbitrary URL.
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(indexHtml);
    });

    return server;
}

function run(): void {
    const port = process.env['PORT'] || 4000;

    // Start up the Node server
    const server = app();
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

run();
