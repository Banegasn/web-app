import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createAuthRouter, passwordHash } from '../server/admin-auth';
import { createAdminRouter, createMediaRouter } from '../server/admin';
import { createCommentsRouter } from '../server/comments';
import { createPostsRouter } from '../server/posts';
import { PostsRepository } from '../server/posts-repository';

test('admin sessions, draft publication, conflict protection, deploy persistence, images and moderation', async () => {
    process.env['ADMIN_USERNAME'] = 'test-admin';
    process.env['ADMIN_PASSWORD_HASH'] = passwordHash('test-password');
    process.env['COMMENTS_ADMIN_TOKEN'] = 'legacy-token';
    const dir = mkdtempSync(join(tmpdir(), 'studio-'));
    const path = join(dir, 'db.sqlite');
    const repo = new PostsRepository(path);
    const seed = new PostsRepository(join(dir, 'seed.sqlite'));
    writeFileSync(
        join(dir, 'posts.json'),
        JSON.stringify({ posts: ['existing'] }),
    );
    writeFileSync(
        join(dir, 'existing.md'),
        '---\nid: existing\ntitle: Original\nsummary: Summary\ncreatedAt: 2026-01-01\n---\nOriginal body',
    );
    seed.importDirectory(dir);
    repo.importDatabase(join(dir, 'seed.sqlite'));
    const app = express();
    app.set('trust proxy', 1);
    app.use('/api/auth', createAuthRouter());
    app.use('/api/admin', createAdminRouter(repo));
    app.use('/api/media', createMediaRouter(repo));
    app.use('/api/posts', createPostsRouter(repo));
    app.use(
        '/api/comments',
        express.json(),
        createCommentsRouter(path, (id) => repo.exists(id)),
    );
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/`;
    let cookie = '';
    const request = (
        url: string,
        method = 'GET',
        body?: unknown,
        headers: Record<string, string> = {},
    ) =>
        fetch(base + url, {
            method,
            headers: {
                Cookie: cookie,
                'Content-Type': 'application/json',
                'X-Admin-Request': '1',
                ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    try {
        assert.equal((await request('admin/posts')).status, 401);
        assert.equal(
            (
                await request('comments/admin', 'GET', undefined, {
                    Authorization: 'Bearer legacy-token',
                })
            ).status,
            401,
        );
        assert.equal(
            (
                await request('auth/login', 'POST', {
                    username: 'test-admin',
                    password: 'wrong',
                })
            ).status,
            401,
        );
        assert.equal(
            (
                await request(
                    'auth/login',
                    'POST',
                    { username: 'test-admin', password: 'test-password' },
                    { 'X-Admin-Request': '' },
                )
            ).status,
            403,
        );
        const login = await request(
            'auth/login',
            'POST',
            { username: 'test-admin', password: 'test-password' },
            { 'X-Forwarded-Proto': 'https' },
        );
        assert.equal(login.status, 200);
        const setCookie = login.headers.get('set-cookie')!;
        assert.match(setCookie, /HttpOnly/);
        assert.match(setCookie, /SameSite=Strict/);
        assert.match(setCookie, /Secure/);
        cookie = setCookie.split(';')[0];
        assert.equal((await request('auth/session')).status, 200);
        const draft = {
            id: 'new-post',
            title: 'A new post',
            summary: 'Summary',
            content: '# Hello\n\n**Markdown** content',
            tags: ['test'],
            language: 'es',
            createdAt: '2026-11-06',
            published: false,
            revision: -1,
        };
        assert.equal(
            (
                await request('admin/posts/new-post', 'PUT', draft, {
                    'X-Admin-Request': '',
                })
            ).status,
            403,
        );
        assert.equal(
            (await request('admin/posts/new-post', 'PUT', draft)).status,
            200,
        );
        assert.equal((await request('posts/new-post')).status, 404);
        assert.equal(
            (await request('admin/posts/new-post', 'PUT', draft)).status,
            409,
        );
        const saved = (await request('admin/posts/new-post').then((r) =>
            r.json(),
        )) as typeof draft;
        assert.equal(
            (
                await request('admin/posts/new-post', 'PUT', {
                    ...saved,
                    published: true,
                })
            ).status,
            200,
        );
        assert.equal((await request('posts/new-post')).status, 200);
        const existing = (await request('admin/posts/existing').then((r) =>
            r.json(),
        )) as typeof draft;
        assert.equal(
            (
                await request('admin/posts/existing', 'PUT', {
                    ...existing,
                    title: 'Managed title',
                    published: false,
                })
            ).status,
            200,
        );
        repo.importDatabase(join(dir, 'seed.sqlite'));
        repo.importDirectory(dir);
        assert.equal(repo.exists('existing'), false);
        assert.equal(
            (repo.adminArticle('existing') as { title: string }).title,
            'Managed title',
        );
        assert.equal(repo.article('new-post')?.post.content, draft.content);
        const image = Buffer.from(
            '89504e470d0a1a0a0000000049454e44ae426082',
            'hex',
        );
        const uploaded = await fetch(base + 'admin/media', {
            method: 'POST',
            headers: {
                Cookie: cookie,
                'X-Admin-Request': '1',
                'Content-Type': 'image/png',
            },
            body: image,
        });
        assert.equal(uploaded.status, 201);
        const { url } = (await uploaded.json()) as { url: string };
        const media = await fetch(base.replace('/api/', '') + url);
        assert.equal(media.headers.get('content-type'), 'image/png');
        assert.deepEqual(Buffer.from(await media.arrayBuffer()), image);
        assert.equal(
            (
                await fetch(base + 'admin/media', {
                    method: 'POST',
                    headers: {
                        Cookie: cookie,
                        'X-Admin-Request': '1',
                        'Content-Type': 'image/png',
                    },
                    body: '<svg onload="alert(1)">',
                })
            ).status,
            400,
        );
        const comment = (await request('comments/new-post', 'POST', {
            author: 'Reader',
            body: 'Useful article',
        }).then((r) => r.json())) as { comment: { id: number } };
        assert.equal(
            (await request(`comments/new-post/${comment.comment.id}`, 'DELETE'))
                .status,
            204,
        );
        const comments = (await request('comments/admin').then((r) =>
            r.json(),
        )) as { comments: unknown[] };
        assert.equal(comments.comments.length, 0);
        assert.equal((await request('auth/logout', 'POST')).status, 204);
        assert.equal((await request('admin/posts')).status, 401);
        // The expired token cannot be replayed, and login attempts are bounded.
        for (let i = 0; i < 10; i++)
            await request('auth/login', 'POST', {
                username: 'test-admin',
                password: 'wrong',
            });
        assert.equal(
            (
                await request('auth/login', 'POST', {
                    username: 'test-admin',
                    password: 'wrong',
                })
            ).status,
            429,
        );
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        seed.close();
        repo.close();
        rmSync(dir, { recursive: true, force: true });
        delete process.env['ADMIN_USERNAME'];
        delete process.env['ADMIN_PASSWORD_HASH'];
        delete process.env['COMMENTS_ADMIN_TOKEN'];
    }
});
