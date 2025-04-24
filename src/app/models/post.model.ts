export interface Post {
    id: string;
    title: string;
    summary: string;
    imageUrl?: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
} 