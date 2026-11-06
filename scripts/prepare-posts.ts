import { renderSitemap, staticPublicRoutes } from '../server/sitemap';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostsRepository } from '../server/posts-repository';

const repository = new PostsRepository(
    join(process.cwd(), '.data', 'posts-build.sqlite'),
);
try {
    repository.importDirectory(join(process.cwd(), 'content', 'posts'));
    const posts = repository.allMetadata();
    const baseUrl = process.env['BASE_URL'] || 'https://banegasn.dev';
    const staticRoutes = staticPublicRoutes;
    writeFileSync('public/sitemap.xml', renderSitemap(posts, baseUrl));
    writeFileSync(
        'prerender-routes.txt',
        [...staticRoutes, ...posts.map((post) => `/blog/${post.id}`)].join(
            '\n',
        ) + '\n',
    );
    console.log(
        `Imported ${posts.length} posts into SQLite and generated sitemap/prerender routes.`,
    );
} finally {
    repository.close();
}
