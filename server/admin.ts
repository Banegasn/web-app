import { Router, json, raw } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from './admin-auth';
import type { PostsRepository } from './posts-repository';
import type { Post } from '../src/app/models/post.model';

export function createAdminRouter(posts: PostsRepository): Router {
    const router = Router();
    router.use(requireAdmin);
    router.get('/posts', (_req, res) => res.json(posts.adminList()));
    router.get('/posts/:id', (req, res) => {
        const post = posts.adminArticle(req.params['id']);
        res.status(post ? 200 : 404).json(
            post ?? { error: 'Post no encontrado.' },
        );
    });
    router.put('/posts/:id', json({ limit: '1mb' }), (req, res) => {
        const p = req.body;
        const id = req.params['id'];
        const fields = [
            'title',
            'summary',
            'content',
            'author',
            'seoTitle',
            'keywords',
            'translationGroup',
            'imageUrl',
        ];
        if (
            !p ||
            !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id) ||
            fields.some(
                (f) => p[f] !== undefined && typeof p[f] !== 'string',
            ) ||
            typeof p.title !== 'string' ||
            !p.title.trim() ||
            p.title.length > 300 ||
            typeof p.summary !== 'string' ||
            p.summary.length > 2000 ||
            typeof p.content !== 'string' ||
            p.content.length > 500000 ||
            !Array.isArray(p.tags) ||
            p.tags.length > 30 ||
            p.tags.some(
                (t: unknown) => typeof t !== 'string' || t.length > 100,
            ) ||
            !['es', 'en', ''].includes(p.language ?? '') ||
            typeof p.published !== 'boolean' ||
            !Number.isInteger(p.revision) ||
            !Number.isFinite(Date.parse(p.createdAt)) ||
            (p.published && (!p.summary.trim() || !p.content.trim())) ||
            (p.imageUrl && !/^(https:\/\/|\/[^/])/.test(p.imageUrl))
        ) {
            res.status(400).json({
                error: 'Revisa los campos. Para publicar necesitas título, resumen y contenido; usa un slug válido.',
            });
            return;
        }
        const post: Post = {
            id,
            title: p.title.trim(),
            summary: p.summary,
            content: p.content,
            author: p.author,
            seoTitle: p.seoTitle,
            keywords: p.keywords,
            translationGroup: p.translationGroup,
            imageUrl: p.imageUrl,
            tags: p.tags,
            language: p.language,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(),
        };
        try {
            res.json(posts.save(post, p.published, p.revision));
        } catch (error) {
            if (error instanceof Error && error.message === 'CONFLICT') {
                res.status(409).json({
                    error: 'El post cambió en otra sesión o el slug ya existe. Recarga antes de guardar.',
                });
                return;
            }
            throw error;
        }
    });
    router.get('/media', (_req, res) => res.json(posts.mediaList()));
    router.post(
        '/media',
        raw({
            type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
            limit: '8mb',
        }),
        (req, res) => {
            const data = req.body;
            if (!Buffer.isBuffer(data)) {
                res.status(400).json({
                    error: 'Usa imágenes PNG, JPEG, WebP o GIF (máximo 8 MB).',
                });
                return;
            }
            const hex = data.subarray(0, 12).toString('hex');
            const type = hex.startsWith('89504e470d0a1a0a')
                ? 'image/png'
                : hex.startsWith('ffd8ff')
                  ? 'image/jpeg'
                  : /^474946383[79]61/.test(hex)
                    ? 'image/gif'
                    : data.toString('ascii', 0, 4) === 'RIFF' &&
                        data.toString('ascii', 8, 12) === 'WEBP'
                      ? 'image/webp'
                      : '';
            if (!type || type !== req.header('content-type')?.split(';')[0]) {
                res.status(400).json({
                    error: 'El archivo no es una imagen válida.',
                });
                return;
            }
            const id = randomUUID();
            posts.addMedia(
                id,
                type,
                data,
                String(req.header('x-file-name') || 'Imagen').slice(0, 200),
            );
            res.status(201).json({ url: `/api/media/${id}` });
        },
    );
    return router;
}
export function createMediaRouter(posts: PostsRepository): Router {
    const router = Router();
    router.get('/:id', (req, res) => {
        const item = posts.media(req.params['id']);
        if (!item) {
            res.sendStatus(404);
            return;
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.type(item.type).send(Buffer.from(item.data));
    });
    return router;
}
