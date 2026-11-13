import type { ImportedPost } from './post-import';

export const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;

export interface PostArchiveReview {
    post: ImportedPost;
    images: { id: string; name: string; size: number }[];
}
