import { Router } from 'express';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MAX_AUTHOR_LENGTH = 60;
const MAX_COMMENT_LENGTH = 1_500;
const MAX_LINKS = 2;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const RATE_LIMIT_MAX_VOTES = 60;

interface CommentRow {
    id: number;
    post_id: string;
    author: string;
    body: string;
    created_at: string;
    parent_id: number | null;
    upvotes: number;
    downvotes: number;
    user_vote: number;
}

interface VoteSummaryRow {
    upvotes: number;
    downvotes: number;
}

export interface PublicComment {
    id: number;
    postId: string;
    author: string;
    body: string;
    createdAt: string;
    parentId: number | null;
    upvotes: number;
    downvotes: number;
    userVote: -1 | 0 | 1;
}

export function createCommentsRouter(
    databasePath = commentsDatabasePath(),
    postsDirectory?: string,
): Router {
    const router = Router();
    const database = openCommentsDatabase(databasePath);
    const attemptsByClient = new Map<string, number[]>();
    const voteAttemptsByClient = new Map<string, number[]>();

    router.use((_, response, next) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        next();
    });

    router.get('/admin', (request, response) => {
        if (!adminRequestIsAuthorized(request)) {
            response.setHeader('WWW-Authenticate', 'Bearer');
            response.status(401).json({ error: 'Unauthorized.' });
            return;
        }

        const rows = database.prepare(`
            SELECT
                c.id,
                c.post_id,
                c.author,
                c.body,
                c.created_at,
                c.parent_id,
                COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
                0 AS user_vote
            FROM comments c
            LEFT JOIN comment_votes v ON v.comment_id = c.id
            WHERE c.visible = 1
            GROUP BY c.id
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT 500
        `).all() as unknown as CommentRow[];

        response.json({ comments: rows.map(toPublicComment) });
    });

    router.get('/:postId', (request, response) => {
        const postId = normalizedPostId(request.params['postId']);
        if (!postId) {
            response.status(400).json({ error: 'Invalid post identifier.' });
            return;
        }
        if (postsDirectory && !postExists(postsDirectory, postId)) {
            response.status(404).json({ error: 'Post not found.' });
            return;
        }

        const voterId = normalizedVoterId(request.header('x-comment-voter'));
        const rows = database.prepare(`
            SELECT
                c.id,
                c.post_id,
                c.author,
                c.body,
                c.created_at,
                c.parent_id,
                COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
                COALESCE(SUM(CASE WHEN v.voter_id = ? THEN v.value ELSE 0 END), 0) AS user_vote
            FROM comments c
            LEFT JOIN comment_votes v ON v.comment_id = c.id
            WHERE c.post_id = ? AND c.visible = 1
            GROUP BY c.id
            ORDER BY c.created_at ASC, c.id ASC
            LIMIT 200
        `).all(voterId, postId) as unknown as CommentRow[];

        response.json({ comments: rows.map(toPublicComment) });
    });

    router.post('/:postId', (request, response) => {
        const postId = normalizedPostId(request.params['postId']);
        if (!postId) {
            response.status(400).json({ error: 'Invalid post identifier.' });
            return;
        }
        if (postsDirectory && !postExists(postsDirectory, postId)) {
            response.status(404).json({ error: 'Post not found.' });
            return;
        }

        const payload = isRecord(request.body) ? request.body : {};
        if (normalizedText(payload['website'], 200)) {
            response.status(400).json({ error: 'The comment could not be submitted.' });
            return;
        }

        const author = normalizedText(payload['author'], MAX_AUTHOR_LENGTH);
        const body = normalizedMultilineText(payload['body'], MAX_COMMENT_LENGTH);
        const rawParentId = payload['parentId'];
        const parentId = rawParentId === undefined || rawParentId === null ? null : Number(rawParentId);
        if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId < 1)) {
            response.status(400).json({ error: 'Invalid parent comment.' });
            return;
        }
        const validationError = validateComment(author, body);
        if (validationError) {
            response.status(400).json({ error: validationError });
            return;
        }

        const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
        if (!consumeAttempt(attemptsByClient, clientKey, Date.now(), RATE_LIMIT_MAX_SUBMISSIONS)) {
            response.status(429).json({ error: 'Too many comments. Please wait a few minutes.' });
            return;
        }

        if (parentId !== null) {
            const parent = database.prepare(`
                SELECT id FROM comments
                WHERE id = ? AND post_id = ? AND visible = 1
            `).get(parentId, postId);
            if (!parent) {
                response.status(400).json({ error: 'Parent comment not found.' });
                return;
            }
        }

        const duplicate = database.prepare(`
            SELECT id
            FROM comments
            WHERE post_id = ? AND lower(author) = lower(?) AND body = ?
              AND parent_id IS ?
              AND created_at >= datetime('now', '-10 minutes')
            LIMIT 1
        `).get(postId, author, body, parentId);
        if (duplicate) {
            response.status(409).json({ error: 'This comment was already published.' });
            return;
        }

        const createdAt = new Date().toISOString();
        const result = database.prepare(`
            INSERT INTO comments (post_id, author, body, created_at, parent_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(postId, author, body, createdAt, parentId);

        response.status(201).json({
            comment: {
                id: Number(result.lastInsertRowid),
                postId,
                author,
                body,
                createdAt,
                parentId,
                upvotes: 0,
                downvotes: 0,
                userVote: 0,
            } satisfies PublicComment,
        });
    });

    router.put('/:postId/:commentId/vote', (request, response) => {
        const postId = normalizedPostId(request.params['postId']);
        const commentId = Number.parseInt(request.params['commentId'] ?? '', 10);
        const voterId = normalizedVoterId(request.header('x-comment-voter'));
        const payload = isRecord(request.body) ? request.body : {};
        const value = Number(payload['value']);
        if (!postId || !Number.isSafeInteger(commentId) || commentId < 1) {
            response.status(400).json({ error: 'Invalid comment identifier.' });
            return;
        }
        if (!voterId) {
            response.status(400).json({ error: 'Invalid voter identifier.' });
            return;
        }
        if (value !== -1 && value !== 0 && value !== 1) {
            response.status(400).json({ error: 'Vote must be -1, 0 or 1.' });
            return;
        }

        const clientKey = `${request.ip || request.socket.remoteAddress || 'unknown'}:${voterId}`;
        if (!consumeAttempt(voteAttemptsByClient, clientKey, Date.now(), RATE_LIMIT_MAX_VOTES)) {
            response.status(429).json({ error: 'Too many votes. Please wait a few minutes.' });
            return;
        }

        const comment = database.prepare(`
            SELECT id FROM comments
            WHERE id = ? AND post_id = ? AND visible = 1
        `).get(commentId, postId);
        if (!comment) {
            response.status(404).json({ error: 'Comment not found.' });
            return;
        }

        if (value === 0) {
            database.prepare(`
                DELETE FROM comment_votes WHERE comment_id = ? AND voter_id = ?
            `).run(commentId, voterId);
        } else {
            database.prepare(`
                INSERT INTO comment_votes (comment_id, voter_id, value, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(comment_id, voter_id) DO UPDATE SET
                    value = excluded.value,
                    created_at = excluded.created_at
            `).run(commentId, voterId, value, new Date().toISOString());
        }

        const summary = database.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS downvotes
            FROM comment_votes
            WHERE comment_id = ?
        `).get(commentId) as unknown as VoteSummaryRow;
        response.json({
            vote: {
                upvotes: Number(summary.upvotes),
                downvotes: Number(summary.downvotes),
                userVote: value,
            },
        });
    });

    router.delete('/:postId/:commentId', (request, response) => {
        if (!adminRequestIsAuthorized(request)) {
            response.setHeader('WWW-Authenticate', 'Bearer');
            response.status(401).json({ error: 'Unauthorized.' });
            return;
        }

        const postId = normalizedPostId(request.params['postId']);
        const commentId = Number.parseInt(request.params['commentId'] ?? '', 10);
        if (!postId || !Number.isSafeInteger(commentId) || commentId < 1) {
            response.status(400).json({ error: 'Invalid comment identifier.' });
            return;
        }

        const result = database.prepare(`
            WITH RECURSIVE descendants(id) AS (
                SELECT id FROM comments WHERE id = ? AND post_id = ?
                UNION ALL
                SELECT comments.id
                FROM comments
                JOIN descendants ON comments.parent_id = descendants.id
            )
            UPDATE comments SET visible = 0
            WHERE id IN (SELECT id FROM descendants)
        `).run(commentId, postId);
        if (!result.changes) {
            response.status(404).json({ error: 'Comment not found.' });
            return;
        }
        response.status(204).send();
    });

    return router;
}

export function commentsDatabasePath(): string {
    if (process.env['COMMENTS_DB_PATH']) return process.env['COMMENTS_DB_PATH'];
    const storageDirectory = process.env['RAILWAY_VOLUME_MOUNT_PATH'] || join(process.cwd(), '.data');
    return join(storageDirectory, 'comments.sqlite');
}

function openCommentsDatabase(databasePath: string): DatabaseSync {
    mkdirSync(dirname(databasePath), { recursive: true });
    const database = new DatabaseSync(databasePath);
    database.exec('PRAGMA foreign_keys = ON;');
    database.exec('PRAGMA journal_mode = WAL;');
    database.exec('PRAGMA busy_timeout = 5000;');
    database.exec(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id TEXT NOT NULL,
            author TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            parent_id INTEGER REFERENCES comments(id),
            visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1))
        );
    `);
    const columns = database.prepare('PRAGMA table_info(comments)').all() as unknown as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'parent_id')) {
        database.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id);');
    }
    database.exec(`
        CREATE INDEX IF NOT EXISTS comments_post_created_idx
            ON comments (post_id, created_at, id);
        CREATE INDEX IF NOT EXISTS comments_parent_idx
            ON comments (parent_id);
        CREATE TABLE IF NOT EXISTS comment_votes (
            comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            voter_id TEXT NOT NULL,
            value INTEGER NOT NULL CHECK (value IN (-1, 1)),
            created_at TEXT NOT NULL,
            PRIMARY KEY (comment_id, voter_id)
        );
        CREATE INDEX IF NOT EXISTS comment_votes_comment_idx
            ON comment_votes (comment_id);
    `);
    return database;
}

function toPublicComment(row: CommentRow): PublicComment {
    return {
        id: row.id,
        postId: row.post_id,
        author: row.author,
        body: row.body,
        createdAt: row.created_at,
        parentId: row.parent_id,
        upvotes: Number(row.upvotes),
        downvotes: Number(row.downvotes),
        userVote: row.user_vote === 1 ? 1 : row.user_vote === -1 ? -1 : 0,
    };
}

function normalizedPostId(value: string | undefined): string {
    const postId = value?.trim().toLowerCase() ?? '';
    return /^[a-z0-9][a-z0-9-]{0,99}$/.test(postId) ? postId : '';
}

function postExists(postsDirectory: string, postId: string): boolean {
    return existsSync(join(postsDirectory, `${postId}.md`));
}

function normalizedText(value: unknown, maximumLength: number): string {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ').slice(0, maximumLength + 1)
        : '';
}

function normalizedMultilineText(value: unknown, maximumLength: number): string {
    return typeof value === 'string'
        ? value.replace(/\r\n?/g, '\n').trim().replace(/\n{3,}/g, '\n\n').slice(0, maximumLength + 1)
        : '';
}

function validateComment(author: string, body: string): string {
    if (author.length < 2 || author.length > MAX_AUTHOR_LENGTH) {
        return `Name must contain between 2 and ${MAX_AUTHOR_LENGTH} characters.`;
    }
    if (body.length < 2 || body.length > MAX_COMMENT_LENGTH) {
        return `Comment must contain between 2 and ${MAX_COMMENT_LENGTH} characters.`;
    }
    if (/[^\P{C}\n\t]/u.test(body) || /[^\P{C}]/u.test(author)) {
        return 'The comment contains unsupported characters.';
    }
    const links = body.match(/(?:https?:\/\/|www\.)/gi)?.length ?? 0;
    if (links > MAX_LINKS) return `Comments may contain at most ${MAX_LINKS} links.`;
    return '';
}

function normalizedVoterId(value: string | undefined): string {
    const voterId = value?.trim() ?? '';
    return /^[a-zA-Z0-9_-]{16,80}$/.test(voterId) ? voterId : '';
}

function adminRequestIsAuthorized(request: Request): boolean {
    const adminToken = process.env['COMMENTS_ADMIN_TOKEN'];
    const authorization = request.header('authorization');
    if (!adminToken || !authorization?.startsWith('Bearer ')) return false;

    const suppliedToken = authorization.slice('Bearer '.length);
    const expected = Buffer.from(adminToken);
    const supplied = Buffer.from(suppliedToken);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function consumeAttempt(
    attemptsByClient: Map<string, number[]>,
    clientKey: string,
    now: number,
    maximumAttempts: number,
): boolean {
    if (attemptsByClient.size > 10_000) {
        for (const [key, attempts] of attemptsByClient) {
            if (!attempts.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) {
                attemptsByClient.delete(key);
            }
        }
    }
    const recentAttempts = (attemptsByClient.get(clientKey) ?? [])
        .filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (recentAttempts.length >= maximumAttempts) {
        attemptsByClient.set(clientKey, recentAttempts);
        return false;
    }
    recentAttempts.push(now);
    attemptsByClient.set(clientKey, recentAttempts);
    return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
