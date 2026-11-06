import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { passwordHash } from '../server/admin-auth';

test(
    'published CMS posts render complete HTML across requests and invalidate on edits',
    { timeout: 20000 },
    async () => {
        const directory = mkdtempSync(join(tmpdir(), 'studio-runtime-'));
        const child = spawn(
            process.execPath,
            ['dist/banegasn/server/server.mjs'],
            {
                env: {
                    ...process.env,
                    PORT: '0',
                    COMMENTS_DB_PATH: join(directory, 'db.sqlite'),
                    ADMIN_USERNAME: 'runtime-test',
                    ADMIN_PASSWORD_HASH: passwordHash('runtime-password'),
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            },
        );
        let logs = '';
        child.stderr.on('data', (data) => (logs += data));
        try {
            const base = await new Promise<string>((resolve, reject) => {
                child.stdout.on('data', (data) => {
                    const match = String(data).match(
                        /http:\/\/localhost:(\d+)/,
                    );
                    if (match) resolve(`http://localhost:${match[1]}`);
                });
                child.once('exit', (code) =>
                    reject(new Error(`Runtime exited ${code}: ${logs}`)),
                );
                child.once('error', reject);
            });
            const login = await fetch(`${base}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Request': '1',
                },
                body: JSON.stringify({
                    username: 'runtime-test',
                    password: 'runtime-password',
                }),
            });
            assert.equal(login.status, 200);
            const cookie = login.headers.get('set-cookie')!.split(';')[0];
            const save = (data: object) =>
                fetch(`${base}/api/admin/posts/runtime-cms`, {
                    method: 'PUT',
                    headers: {
                        Cookie: cookie,
                        'Content-Type': 'application/json',
                        'X-Admin-Request': '1',
                    },
                    body: JSON.stringify(data),
                });
            const post = {
                title: 'Runtime CMS title',
                summary: 'Runtime CMS summary',
                content: '# Runtime CMS title\n\nThe first published version.',
                createdAt: new Date().toISOString(),
                tags: [],
                language: 'es',
                published: true,
                revision: -1,
            };
            assert.equal((await save(post)).status, 200);
            for (const path of [
                '/blog/runtime-cms',
                '/blog/introduction',
                '/blog/runtime-cms',
            ]) {
                const response = await fetch(base + path);
                assert.equal(response.status, 200);
                const html = await response.text();
                assert.match(html, /<app-blog-post/);
                if (path.endsWith('runtime-cms')) {
                    assert.match(
                        html,
                        /<title>Runtime CMS title \| banegasn.dev/,
                    );
                    assert.match(
                        html,
                        /<h1[^>]*>\s*Runtime CMS title\s*<\/h1>/,
                    );
                    assert.match(html, /<p>The first published version\.<\/p>/);
                }
            }
            assert.equal(
                (
                    await save({
                        ...post,
                        revision: 1,
                        title: 'Updated CMS title',
                        content: 'Updated live body.',
                    })
                ).status,
                200,
            );
            const updated = await fetch(`${base}/blog/runtime-cms`).then((r) =>
                r.text(),
            );
            assert.match(updated, /<title>Updated CMS title/);
            assert.match(updated, /<p>Updated live body\.<\/p>/);
            const sitemap = await fetch(`${base}/sitemap.xml`).then((r) =>
                r.text(),
            );
            assert.match(sitemap, /\/blog\/runtime-cms/);
            assert.equal(
                (await save({ ...post, revision: 2, published: false })).status,
                200,
            );
            assert.equal((await fetch(`${base}/blog/runtime-cms`)).status, 404);
            assert.doesNotMatch(
                await fetch(`${base}/sitemap.xml`).then((r) => r.text()),
                /\/blog\/runtime-cms/,
            );
        } finally {
            if (child.exitCode === null && child.signalCode === null) {
                child.kill();
                await new Promise<void>((resolve) =>
                    child.once('exit', () => resolve()),
                );
            }
            rmSync(directory, { recursive: true, force: true });
        }
    },
);
