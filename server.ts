import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './src/main.server';
import { createCommentsRouter } from './server/comments';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html');

    const commonEngine = new CommonEngine({
        allowedHosts: ['banegasn.dev', 'www.banegasn.dev', 'localhost']
    });

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
                res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=600, stale-while-revalidate=86400');
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

    // All regular routes use the Angular engine
    server.get('**', (req, res, next) => {
        const { protocol, originalUrl, baseUrl, headers } = req;

        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=600, stale-while-revalidate=86400');

        commonEngine
            .render({
                bootstrap,
                documentFilePath: indexHtml,
                url: `${protocol}://${headers.host}${originalUrl}`,
                publicPath: browserDistFolder,
                providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
            })
            .then((html) => res.send(html))
            .catch((err) => next(err));
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
