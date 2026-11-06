import { join } from 'node:path';
import { defer, of } from 'rxjs';
import type { PostsSource } from '../src/app/services/posts.service';
import { PostsRepository } from './posts-repository';

let repository: PostsRepository | undefined;

// Only imported by the server config. Prerendering reads SQLite without HTTP.
export function createServerPostsSource(): PostsSource {
    repository ??= new PostsRepository(join(process.cwd(), '.data', 'posts-build.sqlite'));
    const posts = repository;
    return {
        list: query => defer(() => of(posts.list(query))),
        article: id => defer(() => of(posts.article(id))),
    };
}
