import { Router } from 'express';
import type { PostsRepository } from './posts-repository';

export function createPostsRouter(repository: PostsRepository): Router {
    const router = Router();
    router.use((_request, response, next) => {
        response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        next();
    });
    router.get('/', (request, response) => {
        const { language = 'en', search = '', limit = '24', offset = '0' } = request.query;
        if (typeof language !== 'string' || !['en', 'es'].includes(language) ||
            typeof search !== 'string' || search.length > 200 ||
            typeof limit !== 'string' || !/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100 ||
            typeof offset !== 'string' || !/^\d+$/.test(offset) || !Number.isSafeInteger(Number(offset))) {
            response.status(400).json({ error: 'Invalid posts query.' });
            return;
        }
        response.json(repository.list({ language, search, limit: Number(limit), offset: Number(offset) }));
    });
    router.get('/:id', (request, response) => {
        const id = request.params['id'];
        const article = /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) ? repository.article(id) : undefined;
        if (!article) {
            response.status(404).json({ error: 'Post not found.' });
            return;
        }
        response.json(article);
    });
    return router;
}
