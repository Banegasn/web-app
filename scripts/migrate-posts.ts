import { join } from 'node:path';
import { commentsDatabasePath } from '../server/comments';
import { PostsRepository } from '../server/posts-repository';

const repository = new PostsRepository(commentsDatabasePath());
try {
    repository.importDirectory(join(process.cwd(), 'content', 'posts'));
    console.log(`Migrated ${repository.allMetadata().length} posts into the existing SQLite database.`);
} finally {
    repository.close();
}
