export type StudioSection =
    'posts' | 'comments' | 'media' | 'agents' | 'import';

export interface AdminPost {
    id: string;
    title: string;
    summary: string;
    content: string;
    author?: string;
    seoTitle?: string;
    keywords?: string;
    translationGroup?: string;
    language?: string;
    imageUrl?: string;
    tags: string[];
    createdAt: string;
    published: boolean;
    revision: number;
}
export type AdminPostSummary = Omit<AdminPost, 'content'>;
export interface AdminComment {
    id: number;
    postId: string;
    author: string;
    body: string;
    createdAt: string;
    parentId: number | null;
}
export interface MediaItem {
    id: string;
    name: string;
}

export function newPost(): AdminPost {
    return {
        id: '',
        title: '',
        summary: '',
        content: '',
        author: 'Nicolás Banegas',
        language: 'es',
        imageUrl: '',
        tags: [],
        createdAt: new Date().toISOString(),
        published: false,
        revision: -1,
    };
}
export function normalizePost(post: AdminPost): AdminPost {
    return {
        ...post,
        language: post.language || '',
        tags: post.tags || [],
        imageUrl: post.imageUrl?.startsWith('images/')
            ? '/' + post.imageUrl
            : post.imageUrl,
    };
}
