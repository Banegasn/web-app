import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
    Post,
    PostArticle,
    PostSummary,
    PostsQuery,
} from '../src/app/models/post.model';
import { parseMarkdown } from './post-markdown';

interface SummaryRow {
    metadata: string;
}

export class PostsRepository {
    private readonly database: DatabaseSync;
    contentVersion = 0;

    constructor(path: string) {
        mkdirSync(dirname(path), { recursive: true });
        this.database = new DatabaseSync(path);
        this.database.function(
            'posts_lower',
            { deterministic: true },
            (value) => String(value ?? '').toLowerCase(),
        );
        this.database.exec(`
            PRAGMA busy_timeout = 5000;
            PRAGMA journal_mode = WAL;
            PRAGMA cache_size = -2048;
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                metadata TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                language TEXT,
                translation_group TEXT,
                position INTEGER NOT NULL,
                hash TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS managed_posts (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(active, created_at DESC);
            CREATE INDEX IF NOT EXISTS posts_translation_idx ON posts(translation_group, active);
        `);
    }

    // Files are publishing inputs only. Requests always read from SQLite.
    importDirectory(directory: string): void {
        const manifest: { posts: string[] } = JSON.parse(
            readFileSync(join(directory, 'posts.json'), 'utf8'),
        );
        if (
            !Array.isArray(manifest.posts) ||
            new Set(manifest.posts).size !== manifest.posts.length ||
            manifest.posts.some(
                (id) =>
                    typeof id !== 'string' ||
                    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id),
            )
        ) {
            throw new Error('Invalid or duplicate post IDs in manifest.');
        }
        this.transaction(() => {
            this.database.exec(
                'UPDATE posts SET active = 0 WHERE id NOT IN (SELECT id FROM managed_posts)',
            );
            const upsert = this.database.prepare(`
                INSERT INTO posts (id, metadata, title, content, created_at, language, translation_group, position, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, title=excluded.title,
                    content=excluded.content, created_at=excluded.created_at, language=excluded.language,
                    translation_group=excluded.translation_group, position=excluded.position, hash=excluded.hash, active=1
                WHERE posts.id NOT IN (SELECT id FROM managed_posts)
            `);
            manifest.posts.forEach((id, position) => {
                const markdown = readFileSync(
                    join(directory, `${id}.md`),
                    'utf8',
                );
                const { content, ...metadata } = parseMarkdown(markdown, id);
                upsert.run(
                    id,
                    JSON.stringify(metadata),
                    metadata.title,
                    content,
                    metadata.createdAt.toISOString(),
                    metadata.language ?? null,
                    metadata.translationGroup || null,
                    position,
                    createHash('sha256').update(markdown).digest('hex'),
                );
            });
        });
    }

    // Merge the deployment's catalog into the existing comments DB without touching comments.
    importDatabase(seedPath: string): void {
        this.database.prepare('ATTACH DATABASE ? AS catalog').run(seedPath);
        try {
            this.transaction(() => {
                this.database.exec(`
                    INSERT INTO posts (id, metadata, title, content, created_at, language, translation_group, position, hash, active) SELECT id, metadata, title, content, created_at, language, translation_group, position, hash, active FROM catalog.posts WHERE active = 1
                    ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, title=excluded.title,
                        content=excluded.content, created_at=excluded.created_at, language=excluded.language,
                        translation_group=excluded.translation_group, position=excluded.position, hash=excluded.hash, active=1
                    WHERE posts.id NOT IN (SELECT id FROM managed_posts) AND (posts.hash <> excluded.hash OR posts.position <> excluded.position OR posts.active = 0);
                    UPDATE posts SET active = 0 WHERE id NOT IN (SELECT id FROM catalog.posts WHERE active = 1) AND id NOT IN (SELECT id FROM managed_posts);
                `);
            });
        } finally {
            this.database.exec('DETACH DATABASE catalog');
        }
    }

    list(query: PostsQuery = {}): PostSummary[] {
        const rows = this.database
            .prepare(
                `
            WITH preferred AS (
                SELECT id, metadata, created_at, position,
                    row_number() OVER (
                        PARTITION BY CASE WHEN translation_group IS NULL THEN 'post:' || id ELSE 'group:' || translation_group END
                        ORDER BY CASE WHEN language = ? THEN 0 WHEN language IS NULL THEN 1 ELSE 2 END, position
                    ) AS preference
                FROM posts WHERE active = 1
            )
            SELECT metadata FROM preferred
            WHERE preference = 1 AND (? = '' OR id IN (
                SELECT id FROM posts WHERE instr(posts_lower(title), posts_lower(?)) > 0 OR instr(posts_lower(content), posts_lower(?)) > 0
            ))
            ORDER BY created_at DESC, position
            LIMIT ? OFFSET ?
        `,
            )
            .all(
                query.language || 'en',
                query.search || '',
                query.search || '',
                query.search || '',
                query.limit ?? 24,
                query.offset ?? 0,
            ) as unknown as SummaryRow[];
        return rows.map((row) => JSON.parse(row.metadata) as PostSummary);
    }

    article(id: string): PostArticle | undefined {
        const row = this.database
            .prepare(
                'SELECT metadata, content, translation_group FROM posts WHERE id = ? AND active = 1',
            )
            .get(id) as
            | {
                  metadata: string;
                  content: string;
                  translation_group: string | null;
              }
            | undefined;
        if (!row) return undefined;
        const translations = row.translation_group
            ? (this.database
                  .prepare(
                      `
            SELECT metadata FROM posts WHERE translation_group = ? AND id <> ? AND active = 1 ORDER BY position
        `,
                  )
                  .all(row.translation_group, id) as unknown as SummaryRow[])
            : [];
        return {
            post: { ...JSON.parse(row.metadata), content: row.content },
            translations: translations.map(
                (item) => JSON.parse(item.metadata) as PostSummary,
            ),
        };
    }

    exists(id: string): boolean {
        return !!this.database
            .prepare('SELECT 1 FROM posts WHERE id = ? AND active = 1')
            .get(id);
    }

    allMetadata(): PostSummary[] {
        return (
            this.database
                .prepare(
                    'SELECT metadata FROM posts WHERE active = 1 ORDER BY position',
                )
                .all() as unknown as SummaryRow[]
        ).map((row) => JSON.parse(row.metadata) as PostSummary);
    }

    adminList(): object[] {
        return this.database
            .prepare(
                `SELECT p.metadata, p.active, COALESCE(m.revision, 0) revision FROM posts p LEFT JOIN managed_posts m ON m.id=p.id ORDER BY p.created_at DESC`,
            )
            .all()
            .map((row) => ({
                ...JSON.parse(String(row['metadata'])),
                published: !!row['active'],
                revision: row['revision'],
            }));
    }

    adminArticle(id: string): object | undefined {
        const row = this.database
            .prepare(
                `SELECT p.*, COALESCE(m.revision,0) revision FROM posts p LEFT JOIN managed_posts m ON m.id=p.id WHERE p.id=?`,
            )
            .get(id);
        return row
            ? {
                  ...JSON.parse(String(row['metadata'])),
                  content: row['content'],
                  published: !!row['active'],
                  revision: row['revision'],
              }
            : undefined;
    }

    save(post: Post, published: boolean, revision: number): object {
        this.transaction(() => {
            const existing = this.adminArticle(post.id) as
                { revision: number } | undefined;
            if ((existing?.revision ?? -1) !== revision)
                throw new Error('CONFLICT');
            const { content, ...metadata } = post;
            this.database
                .prepare(
                    `INSERT INTO posts (id, metadata, title, content, created_at, language, translation_group, position, hash, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, -1, 'managed', ?)
                ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, title=excluded.title, content=excluded.content,
                created_at=excluded.created_at, language=excluded.language, translation_group=excluded.translation_group, active=excluded.active`,
                )
                .run(
                    post.id,
                    JSON.stringify(metadata),
                    post.title,
                    content,
                    new Date(post.createdAt).toISOString(),
                    post.language || null,
                    post.translationGroup || null,
                    published ? 1 : 0,
                );
            this.database
                .prepare(
                    `INSERT INTO managed_posts (id, revision) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET revision=revision+1`,
                )
                .run(post.id);
        });
        this.contentVersion++;
        return this.adminArticle(post.id)!;
    }

    addMedia(id: string, type: string, data: Buffer, name: string): void {
        this.database
            .prepare('INSERT INTO media VALUES (?, ?, ?, ?, ?)')
            .run(id, type, data, name, new Date().toISOString());
    }
    media(id: string): { type: string; data: Uint8Array } | undefined {
        return this.database
            .prepare('SELECT type, data FROM media WHERE id=?')
            .get(id) as { type: string; data: Uint8Array } | undefined;
    }
    mediaList(): object[] {
        return this.database
            .prepare(
                'SELECT id, name, created_at FROM media ORDER BY created_at DESC LIMIT 100',
            )
            .all();
    }

    close(): void {
        this.database.close();
    }

    private transaction(action: () => void): void {
        this.database.exec('BEGIN IMMEDIATE');
        try {
            action();
            this.database.exec('COMMIT');
        } catch (error) {
            this.database.exec('ROLLBACK');
            throw error;
        }
    }
}
