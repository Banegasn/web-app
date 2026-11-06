import { Router, json, type Request, type RequestHandler } from 'express';
import {
    createHash,
    randomBytes,
    scryptSync,
    timingSafeEqual,
} from 'node:crypto';

const sessions = new Map<string, number>();
const attempts = new Map<string, { count: number; until: number }>();
const lifetime = 8 * 60 * 60 * 1000;
const cookieName = 'banegasn_admin';
function key(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}
function cookie(request: Request): string {
    return (
        request.headers.cookie
            ?.split(';')
            .map((v) => v.trim())
            .find((v) => v.startsWith(`${cookieName}=`))
            ?.slice(cookieName.length + 1) ?? ''
    );
}
export function adminRequestIsAuthorized(request: Request): boolean {
    const expires = sessions.get(key(cookie(request))) ?? 0;
    return expires > Date.now();
}
export const requireAdmin: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!adminRequestIsAuthorized(req)) {
        res.status(401).json({ error: 'Inicia sesión para continuar.' });
        return;
    }
    if (
        !['GET', 'HEAD'].includes(req.method) &&
        req.header('x-admin-request') !== '1'
    ) {
        res.status(403).json({ error: 'Solicitud no válida.' });
        return;
    }
    next();
};
export function passwordHash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function createAuthRouter(): Router {
    const router = Router();
    router.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
    router.get('/session', (req, res) =>
        res
            .status(adminRequestIsAuthorized(req) ? 200 : 401)
            .json({ authenticated: adminRequestIsAuthorized(req) }),
    );
    router.post('/login', json({ limit: '2kb' }), (req, res) => {
        if (req.header('x-admin-request') !== '1') {
            res.sendStatus(403);
            return;
        }
        const username = process.env['ADMIN_USERNAME'];
        const hash = process.env['ADMIN_PASSWORD_HASH'];
        if (!username || !hash) {
            res.status(503).json({
                error: 'Configura ADMIN_USERNAME y ADMIN_PASSWORD_HASH en el servidor.',
            });
            return;
        }
        const client = req.ip || 'unknown';
        const now = Date.now();
        for (const [id, expires] of sessions)
            if (expires <= now) sessions.delete(id);
        for (const [id, attempt] of attempts)
            if (attempt.until <= now) attempts.delete(id);
        const attempt = attempts.get(client) ?? {
            count: 0,
            until: now + 15 * 60 * 1000,
        };
        if (
            attempt.count >= 10 ||
            attempts.size >= 10000 ||
            sessions.size >= 10000
        ) {
            res.status(429).json({
                error: 'Demasiados intentos. Espera 15 minutos.',
            });
            return;
        }
        attempt.count++;
        attempts.set(client, attempt);
        const [salt, digest] = hash.split(':');
        const password =
            typeof req.body?.password === 'string' ? req.body.password : '';
        if (
            !salt ||
            !/^[a-f0-9]{128}$/.test(digest ?? '') ||
            password.length > 256
        ) {
            res.sendStatus(401);
            return;
        }
        const actual = scryptSync(password, salt, 64);
        const correct = timingSafeEqual(actual, Buffer.from(digest, 'hex'));
        if (!correct || req.body?.username !== username) {
            res.status(401).json({
                error: 'Usuario o contraseña incorrectos.',
            });
            return;
        }
        attempts.delete(client);
        const token = randomBytes(32).toString('hex');
        sessions.set(key(token), now + lifetime);
        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: req.secure,
            sameSite: 'strict',
            path: '/api',
            maxAge: lifetime,
        });
        res.json({ authenticated: true });
    });
    router.post('/logout', requireAdmin, (req, res) => {
        sessions.delete(key(cookie(req)));
        res.clearCookie(cookieName, { path: '/api' });
        res.sendStatus(204);
    });
    return router;
}
