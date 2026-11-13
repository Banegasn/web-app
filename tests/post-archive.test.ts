import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { inspectPostArchive } from '../server/post-archive';
import { createAdminRouter, createMediaRouter } from '../server/admin';
import { createAuthRouter, passwordHash } from '../server/admin-auth';
import { createPostsRouter } from '../server/posts';
import { PostsRepository } from '../server/posts-repository';
import { zipFixture } from './zip-fixture';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jEhoAAAAASUVORK5CYII=', 'base64');
const metadata = { id: 'zip-post', title: 'ZIP draft', summary: 'Summary', createdAt: '2026-11-13', imageUrl: 'images/screen one.png', tags: ['ZIP'] };
const markdown = '## Article\n\n![Inline](images/screen%20one.png "Title")\n\n![Reference][proof]\n\n[proof]: images/screen%20one.png\n\n<img data-src="unchanged" src="images/screen%20one.png" alt="HTML">\n\n```md\n![Inline](images/screen%20one.png "Title")\n```\n\n`![Reference][proof]`\n\n![External](https://example.com/image.png)';
function bundle(content = markdown) {
    return zipFixture([
        { name: 'article/studio-import.json', data: JSON.stringify({ metadata, content }), deflate: true },
        { name: 'article/images/screen one.png', data: png },
        { name: 'article/notes.json', data: '{"not":"a post"}' },
    ]);
}

test('rewrites nested covers, Markdown/reference and HTML images without changing code or remote URLs', async () => {
    const result = await inspectPostArchive(bundle());
    assert.equal(result.images.length, 1);
    const url = result.post.imageUrl!;
    assert.match(url, /^\/api\/media\/zip-[a-f0-9]{64}$/);
    assert.ok(result.post.content.includes(`![Inline](${url} "Title")`));
    assert.ok(result.post.content.includes(`![Reference](${url})`));
    assert.ok(result.post.content.includes(`data-src="unchanged" src="${url}"`));
    assert.ok(result.post.content.includes('```md\n![Inline](images/screen%20one.png "Title")\n```'));
    assert.ok(result.post.content.includes('`![Reference][proof]`'));
    assert.ok(result.post.content.includes('https://example.com/image.png'));
    assert.deepEqual(result.images[0].data, png);
});

test('rejects ambiguous manifests, unsafe paths, symlinks, missing images, invalid bytes and expansion bombs', async () => {
    const manifest = { name: 'post.json', data: JSON.stringify({ ...metadata, imageUrl: '', content: 'Text' }) };
    const invalid = [
        Buffer.from('not a zip'),
        zipFixture([manifest, { ...manifest, name: 'studio-import.json' }]),
        zipFixture([manifest, { name: '../outside.png', data: png }]),
        zipFixture([manifest, { name: '/absolute.png', data: png }]),
        zipFixture([manifest, { name: 'image.png', data: 'target', attributes: 0xa1ff0000 }]),
        zipFixture([manifest, { name: 'same.png', data: png }, { name: 'SAME.PNG', data: png }]),
        zipFixture([manifest, { name: 'large.txt', data: 'x', deflate: true, size: 65 * 1024 * 1024 }]),
        zipFixture([{ ...manifest, data: 'x'.repeat(2 * 1024 * 1024), deflate: true, size: 10 }]),
        bundle('![Missing](images/missing.png)'),
        bundle('![Outside](../outside.png)'),
        bundle('<img srcset="images/screen%20one.png 1x">'),
        zipFixture([{ name: 'post.json', data: JSON.stringify({ ...metadata, content: 'Text' }) }, { name: 'images/screen one.png', data: '<svg onload="alert(1)"/>' }]),
        zipFixture([manifest, ...Array.from({ length: 128 }, (_, i) => ({ name: `file-${i}`, data: '' }))]),
    ];
    for (const archive of invalid) await assert.rejects(inspectPostArchive(archive));
});

test('ZIP review is read-only; authenticated import stores media atomically without saving or publishing a post', async () => {
    process.env['ADMIN_USERNAME'] = 'archive-admin';
    process.env['ADMIN_PASSWORD_HASH'] = passwordHash('archive-password');
    const dir = mkdtempSync(join(tmpdir(), 'post-archive-'));
    const repo = new PostsRepository(join(dir, 'posts.sqlite'));
    const app = express();
    app.use('/api/auth', createAuthRouter());
    app.use('/api/admin', createAdminRouter(repo));
    app.use('/api/media', createMediaRouter(repo));
    app.use('/api/posts', createPostsRouter(repo));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    let cookie = '';
    const upload = (path: string, data = bundle(), csrf = true) => fetch(base + '/api/admin/import/zip' + path, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/zip', 'X-Admin-Request': csrf ? '1' : '' }, body: data,
    });
    try {
        assert.equal((await upload('/review')).status, 401);
        const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' }, body: JSON.stringify({ username: 'archive-admin', password: 'archive-password' }) });
        cookie = login.headers.get('set-cookie')!.split(';')[0];
        assert.equal((await upload('', bundle(), false)).status, 403);
        const reviewed = await upload('/review'); assert.equal(reviewed.status, 200);
        assert.equal(reviewed.headers.get('cache-control'), 'no-store');
        assert.equal(repo.mediaList().length, 0);
        assert.equal((await upload('', bundle('![Missing](missing.png)'))).status, 400);
        assert.equal(repo.mediaList().length, 0);
        const imported = await upload(''); assert.equal(imported.status, 200);
        const result = await imported.json() as { post: { imageUrl: string } };
        assert.equal(repo.mediaList().length, 1);
        const media = await fetch(base + result.post.imageUrl);
        assert.deepEqual(Buffer.from(await media.arrayBuffer()), png);
        assert.equal((await upload('')).status, 200);
        assert.equal(repo.mediaList().length, 1, 'retrying an import must not duplicate the same media');
        assert.equal(repo.adminArticle('zip-post'), undefined);
        assert.equal((await fetch(base + '/api/posts/zip-post')).status, 404);
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        repo.close(); rmSync(dir, { recursive: true, force: true });
        delete process.env['ADMIN_USERNAME']; delete process.env['ADMIN_PASSWORD_HASH'];
    }
});
