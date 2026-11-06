import { renderSitemap } from './server/sitemap';
import { CommonEngine } from '@angular/ssr/node';
import bootstrap from './server/runtime-bootstrap';
import { useRuntimePosts } from './server/posts-source';
import { readFileSync } from 'node:fs';
import { createAuthRouter } from './server/admin-auth';
import { createAdminRouter, createMediaRouter } from './server/admin';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostsRepository } from './server/posts-repository';
import { createPostsRouter } from './server/posts';
import { commentsDatabasePath, createCommentsRouter } from './server/comments';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html');

    server.set('view engine', 'html');
    server.set('views', browserDistFolder);
    server.set('trust proxy', 1);

    // Allow Angular's fixed hydration scripts and the configured analytics endpoints.
    server.use((_req, res, next) => {
        res.setHeader(
            'Content-Security-Policy',
            [
                "default-src 'self'",
                "script-src 'self' https: 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https:",
                "worker-src 'self' blob:",
                "frame-ancestors 'self' https://trk.tivq.link",
                "base-uri 'self'",
                "form-action 'self'",
            ].join('; '),
        );
        next();
    });

    const posts = new PostsRepository(commentsDatabasePath());
    posts.importDatabase(join(serverDistFolder, 'posts.sqlite'));
    server.use('/api/auth', createAuthRouter());
    server.use('/api/admin', createAdminRouter(posts));
    server.use('/api/media', createMediaRouter(posts));
    server.use('/api/posts', createPostsRouter(posts));

    server.use(
        '/api/comments',
        express.json({ limit: '8kb', type: 'application/json' }),
        createCommentsRouter(undefined, (id) => posts.exists(id)),
    );

    useRuntimePosts(posts);
    const engine = new CommonEngine({ allowedHosts: ['banegasn.dev'] });
    const shell = readFileSync(indexHtml, 'utf8');
    const rendered = new Map<string, Promise<string>>();
    let renderedVersion = posts.contentVersion;
    server.get('/sitemap.xml', (_req, res) => {
        res.type('application/xml').setHeader('Cache-Control', 'no-cache');
        res.send(renderSitemap(posts.allMetadata()));
    });
    server.get(['/', '/blog', '/blog/:id'], (req, res, next) => {
        if (req.params['id'] && !posts.exists(req.params['id'])) {
            res.status(404).setHeader('Cache-Control', 'no-store');
            res.send(shell);
            return;
        }
        res.setHeader('Cache-Control', 'no-store');
        if (renderedVersion !== posts.contentVersion) {
            rendered.clear();
            renderedVersion = posts.contentVersion;
        }
        let page = rendered.get(req.path);
        if (!page) {
            if (rendered.size >= 12)
                rendered.delete(rendered.keys().next().value!);
            page = engine.render({
                bootstrap,
                document: shell,
                url: `https://banegasn.dev${req.path}`,
                publicPath: browserDistFolder,
                inlineCriticalCss: false,
            });
            rendered.set(req.path, page);
            const pending = page;
            page.catch(() => {
                if (rendered.get(req.path) === pending)
                    rendered.delete(req.path);
            });
        }
        page.then((html) => res.send(html)).catch(next);
    });

    server.use('/admin', (_req, res, next) => {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
    server.use('/api', (_req, res) => {
        res.status(404).json({ error: 'Ruta no encontrada.' });
    });

    // Serve static files from /browser
    server.get(
        '**',
        express.static(browserDistFolder, {
            maxAge: '1y',
            index: 'index.html',
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    // These files are immutable for a deployment. Give the CDN a
                    // short, explicit TTL so Cloudflare can cache the prerendered
                    // HTML instead of forwarding every crawler request to Railway.
                    res.setHeader(
                        'Cache-Control',
                        'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
                    );
                }
                if (
                    filePath.endsWith('robots.txt') ||
                    filePath.endsWith('sitemap.xml') ||
                    filePath.endsWith('.webmanifest')
                ) {
                    res.setHeader(
                        'Cache-Control',
                        'public, max-age=3600, s-maxage=3600',
                    );
                }
            },
        }),
    );

    // Keep retired public Markdown URLs from returning the application shell.
    server.get('/posts/*', (_req, res) => {
        res.status(404).type('text/plain').send('Post not found');
    });

    // Other routes use the client shell; public blog routes render the live database above.
    server.get('**', (_req, res) => {
        // Do not let a CDN cache a client-side fallback under an arbitrary URL.
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(indexHtml);
    });

    return server;
}

function run(): void {
    const port = Number(process.env['PORT'] || 4000);
    const server = app();
    const listener = server.listen(port, () => {
        const address = listener.address();
        const actualPort = address && typeof address !== 'string' ? address.port : port;
        console.log(`Node Express server listening on http://localhost:${actualPort}`);
    });
}

run();
