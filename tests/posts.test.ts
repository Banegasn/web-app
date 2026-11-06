import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import express from 'express';
import { createCommentsRouter } from '../server/comments';
import { parseMarkdown } from '../server/post-markdown';
import { PostsRepository } from '../server/posts-repository';
import { createPostsRouter } from '../server/posts';

function fixture() {
    const directory = mkdtempSync(join(tmpdir(), 'blog-posts-'));
    const databasePath = join(directory, 'comments.sqlite');
    const repository = new PostsRepository(databasePath);
    return { directory, databasePath, repository, close: () => { repository.close(); rmSync(directory, { recursive: true, force: true }); } };
}

function writePosts(directory: string, ids = ['article-es', 'article-en', 'standalone']) {
    writeFileSync(join(directory, 'posts.json'), JSON.stringify({ posts: ids }));
    for (const id of ids) {
        writeFileSync(join(directory, `${id}.md`), `---\nid: "${id}"\ntitle: "Title ${id}"\nsummary: "Summary"\ncreatedAt: "2026-01-01 12:00:00"\n${id.startsWith('article') ? `translationGroup: "article"\nlanguage: "${id.endsWith('es') ? 'es' : 'en'}"\n` : ''}---\nBody with unique-needle ÁRBOL ${id}`);
    }
}

test('imports every published post without changing content or metadata; summaries never include bodies', () => {
    const f = fixture();
    try {
        const directory = join(process.cwd(), 'content', 'posts');
        f.repository.importDirectory(directory);
        const manifest = JSON.parse(readFileSync(join(directory, 'posts.json'), 'utf8'));
        assert.equal(f.repository.allMetadata().length, manifest.posts.length);
        for (const id of manifest.posts) {
            const original = parseMarkdown(readFileSync(join(directory, `${id}.md`), 'utf8'), id);
            assert.deepEqual(f.repository.article(id)?.post, JSON.parse(JSON.stringify(original)));
        }
        assert.ok(f.repository.list().every(post => !('content' in post)));
        const serializedBodies = manifest.posts.reduce((size: number, id: string) => size + Buffer.byteLength(JSON.stringify(f.repository.article(id)?.post)), 0);
        const summaryBytes = Buffer.byteLength(JSON.stringify(f.repository.list({ limit: 100 })));
        assert.ok(summaryBytes < serializedBodies / 5);
        console.log(`Posts payload: ${serializedBodies} bytes for all bodies; ${summaryBytes} bytes for the default-language summaries.`);
    } finally { f.close(); }
});

test('selects preferred translations before search and pagination, preserving fallback order', () => {
    const f = fixture();
    try {
        writePosts(f.directory);
        f.repository.importDirectory(f.directory);
        assert.deepEqual(f.repository.list({ language: 'es' }).map(p => p.id), ['article-es', 'standalone']);
        assert.deepEqual(f.repository.list({ language: 'en' }).map(p => p.id), ['article-en', 'standalone']);
        assert.deepEqual(f.repository.list({ language: 'fr' }).map(p => p.id), ['article-es', 'standalone']);
        assert.equal(f.repository.list({ language: 'en', search: 'article-es' }).length, 0);
        assert.equal(f.repository.list({ search: 'UNIQUE-NEEDLE', limit: 1, offset: 1 })[0].id, 'standalone');
        assert.equal(f.repository.list({ search: 'árbol' }).length, 2);
        assert.equal(f.repository.list({ search: "' OR 1=1 --" }).length, 0);
        assert.equal(f.repository.list({ search: '%' }).length, 0);
        const article = f.repository.article('article-es')!;
        assert.deepEqual(article.translations.map(p => p.id), ['article-en']);
        assert.ok(!('content' in article.translations[0]));
        assert.equal(f.repository.article('missing'), undefined);
    } finally { f.close(); }
});

test('catalog merges are repeatable, update and retire posts, and preserve existing comments', () => {
    const f = fixture();
    const seed = new PostsRepository(join(f.directory, 'seed.sqlite'));
    const db = new DatabaseSync(f.databasePath);
    try {
        db.exec("CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id TEXT, body TEXT); INSERT INTO comments VALUES (1, 'article-es', 'Keep me')");
        writePosts(f.directory);
        seed.importDirectory(f.directory);
        f.repository.importDatabase(join(f.directory, 'seed.sqlite'));
        f.repository.importDatabase(join(f.directory, 'seed.sqlite'));
        assert.ok(f.repository.exists('article-es'));
        const source = join(f.directory, 'standalone.md');
        writeFileSync(source, readFileSync(source, 'utf8').replace('Summary', 'Updated summary'));
        writeFileSync(join(f.directory, 'posts.json'), JSON.stringify({ posts: ['standalone'] }));
        seed.importDirectory(f.directory);
        f.repository.importDatabase(join(f.directory, 'seed.sqlite'));
        assert.equal(f.repository.article('standalone')?.post.summary, 'Updated summary');
        assert.equal(f.repository.exists('article-es'), false);
        assert.equal(f.repository.article('article-es'), undefined);
        assert.equal(db.prepare('SELECT body FROM comments').get()?.['body'], 'Keep me');
        assert.equal(db.prepare('SELECT COUNT(*) AS count FROM posts').get()?.['count'], 3);
    } finally { seed.close(); db.close(); f.close(); }
});

test('invalid imports roll back the entire catalog', () => {
    const f = fixture();
    try {
        writePosts(f.directory);
        f.repository.importDirectory(f.directory);
        writeFileSync(join(f.directory, 'article-en.md'), 'invalid markdown');
        assert.throws(() => f.repository.importDirectory(f.directory), /front matter/);
        assert.equal(f.repository.allMetadata().length, 3);
        assert.ok(f.repository.article('article-en'));
        writeFileSync(join(f.directory, 'posts.json'), JSON.stringify({ posts: ['../escape'] }));
        assert.throws(() => f.repository.importDirectory(f.directory), /Invalid/);
    } finally { f.close(); }
});

test('posts and comments APIs use the database, validate input, and return cacheable summaries', async () => {
    const f = fixture();
    writePosts(f.directory);
    f.repository.importDirectory(f.directory);
    const app = express();
    app.use('/api/posts', createPostsRouter(f.repository));
    // Exercise comment validation after the markdown source has disappeared.
    app.use('/api/comments', express.json(), createCommentsRouter(f.databasePath, id => f.repository.exists(id)));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    try {
        rmSync(join(f.directory, 'article-es.md'));
        const response = await fetch(`${base}/api/posts?language=es&limit=1`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control')!, /public/);
        const summaries = await response.json() as object[];
        assert.equal(summaries.length, 1);
        assert.ok(!('content' in summaries[0]));
        const article = await fetch(`${base}/api/posts/article-es`).then(r => r.json()) as { post: { content: string }; translations: object[] };
        assert.match(article.post.content, /unique-needle/);
        assert.equal(article.translations.length, 1);
        for (const query of ['limit=0', 'limit=101', 'limit=1.2', 'offset=-1', 'offset=9007199254740992', 'language=de', 'language[]=en', `search=${'x'.repeat(201)}`]) {
            assert.equal((await fetch(`${base}/api/posts?${query}`)).status, 400, query);
        }
        assert.equal((await fetch(`${base}/api/posts/missing`)).status, 404);
        assert.equal((await fetch(`${base}/api/comments/article-es`)).status, 200);
        assert.equal((await fetch(`${base}/api/comments/missing`)).status, 404);
        const comment = await fetch(`${base}/api/comments/article-es`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: 'Tester', body: 'Comment saved against a SQLite post' }),
        });
        assert.equal(comment.status, 201);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        f.close();
    }
});
