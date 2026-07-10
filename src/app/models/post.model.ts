export interface Post {
    id: string;
    title: string;
    seoTitle?: string;
    summary: string;
    imageUrl?: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    author?: string;
    tags?: string[];
    keywords?: string;
    language?: string;
    translationGroup?: string;
} 
