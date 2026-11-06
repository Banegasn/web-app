import express from 'express';
import { join } from 'node:path';
import { PostsRepository } from './posts-repository';
import { createPostsRouter } from './posts';
import { commentsDatabasePath, createCommentsRouter } from './comments';

const server = express();
const port = Number.parseInt(process.env['COMMENTS_PORT'] || '4001', 10);

const posts = new PostsRepository(commentsDatabasePath());
posts.importDirectory(join(process.cwd(), 'content', 'posts'));
server.use('/api/posts', createPostsRouter(posts));

server.use(
    '/api/comments',
    express.json({ limit: '8kb', type: 'application/json' }),
    createCommentsRouter(undefined, id => posts.exists(id)),
);

server.listen(port, '127.0.0.1', () => {
    console.log(`Blog API listening on http://127.0.0.1:${port}`);
});
