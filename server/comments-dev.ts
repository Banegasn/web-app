import express from 'express';
import { join } from 'node:path';
import { createCommentsRouter } from './comments';

const server = express();
const port = Number.parseInt(process.env['COMMENTS_PORT'] || '4001', 10);

server.use(
    '/api/comments',
    express.json({ limit: '8kb', type: 'application/json' }),
    createCommentsRouter(undefined, join(process.cwd(), 'public', 'posts')),
);

server.listen(port, '127.0.0.1', () => {
    console.log(`Comments API listening on http://127.0.0.1:${port}`);
});
