import type { PostSummary } from '../src/app/models/post.model';

const escapeXml = (value: string): string =>
    value.replace(
        /[&<>"']/g,
        (char) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;',
            })[char]!,
    );
export const staticPublicRoutes = ['/', '/blog', '/tools/seo', '/tools/seo/en'];

export function renderSitemap(
    posts: PostSummary[],
    origin = 'https://banegasn.dev',
): string {
    const base = new URL(origin);
    const urls = staticPublicRoutes.map(
        (path) =>
            `<url><loc>${escapeXml(new URL(path, base).href)}</loc><priority>${path === '/' ? '1.00' : '0.80'}</priority></url>`,
    );
    for (const post of posts) {
        const image = post.imageUrl
            ? `<image:image><image:loc>${escapeXml(new URL(post.imageUrl, base).href)}</image:loc><image:title>${escapeXml(post.title)}</image:title></image:image>`
            : '';
        const updated = new Date(post.updatedAt || post.createdAt)
            .toISOString()
            .slice(0, 10);
        urls.push(
            `<url><loc>${escapeXml(new URL(`/blog/${post.id}`, base).href)}</loc><lastmod>${updated}</lastmod><priority>0.64</priority>${image}</url>`,
        );
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}\n</urlset>`;
}
