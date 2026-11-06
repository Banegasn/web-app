import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostsRepository } from '../server/posts-repository';

const repository = new PostsRepository(join(process.cwd(), '.data', 'posts-build.sqlite'));
try {
    repository.importDirectory(join(process.cwd(), 'content', 'posts'));
    const posts = repository.allMetadata();
    const baseUrl = process.env['BASE_URL'] || 'https://banegasn.dev';
    const staticRoutes = ['/', '/blog', '/tools/seo', '/tools/seo/en'];
    const escapeXml = (value: string) => value.replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
    const today = new Date().toISOString().slice(0, 10);
    const urls = staticRoutes.map((route, index) => `
  <url>
    <loc>${escapeXml(baseUrl + route)}</loc>${index < 2 ? `
    <lastmod>${today}</lastmod>` : ''}
    <priority>${index === 0 ? '1.00' : '0.80'}</priority>
  </url>`);
    for (const post of posts) {
        const image = post.imageUrl ? `
    <image:image>
      <image:loc>${escapeXml(`${baseUrl}/${post.imageUrl}`)}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
    </image:image>` : '';
        urls.push(`
  <url>
    <loc>${escapeXml(`${baseUrl}/blog/${post.id}`)}</loc>
    <lastmod>${new Date(post.updatedAt || post.createdAt).toISOString().slice(0, 10)}</lastmod>
    <priority>0.64</priority>${image}
  </url>`);
    }
    writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}\n</urlset>`);
    writeFileSync('prerender-routes.txt', [...staticRoutes, ...posts.map(post => `/blog/${post.id}`)].join('\n') + '\n');
    console.log(`Imported ${posts.length} posts into SQLite and generated sitemap/prerender routes.`);
} finally {
    repository.close();
}
