export interface PostSummary {
    id: string;
    title: string;
    seoTitle?: string;
    summary: string;
    imageUrl?: string;
    createdAt: Date;
    updatedAt?: Date;
    author?: string;
    tags?: string[];
    keywords?: string;
    language?: string;
    translationGroup?: string;
} 

export interface Post extends PostSummary {
    content: string;
}

export interface PostArticle {
    post: Post;
    translations: PostSummary[];
}

export interface PostsQuery {
    language?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
