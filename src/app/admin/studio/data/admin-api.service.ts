import { Injectable, signal } from '@angular/core';
import {
    AdminComment,
    AdminPost,
    AdminPostSummary,
    MediaItem,
} from './admin.models';
import { MAX_ARCHIVE_BYTES, PostArchiveReview } from '../import/post-archive.models';

/** Same-origin transport. All credentials remain in the HttpOnly session cookie. */
@Injectable()
export class AdminApiService {
    readonly sessionExpired = signal(false);
    private async request<T>(
        path: string,
        options: RequestInit = {},
    ): Promise<T> {
        const response = await fetch(`/api/${path}`, {
            ...options,
            headers: { 'X-Admin-Request': '1', ...options.headers },
        });
        if (response.status === 401 && path !== 'auth/login')
            this.sessionExpired.set(true);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(
                body.error ||
                    (response.status === 413
                        ? 'El archivo supera el tamaño permitido.'
                        : 'No se pudo completar la operación.'),
            );
        }
        return response.status === 204 ? (undefined as T) : response.json();
    }
    private json(method: string, body: unknown): RequestInit {
        return {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        };
    }
    async session(): Promise<void> {
        await this.request('auth/session');
        this.sessionExpired.set(false);
    }
    async login(username: string, password: string): Promise<void> {
        await this.request(
            'auth/login',
            this.json('POST', { username, password }),
        );
        this.sessionExpired.set(false);
    }
    logout(): Promise<void> {
        return this.request('auth/logout', { method: 'POST' });
    }
    listPosts(): Promise<AdminPostSummary[]> {
        return this.request('admin/posts');
    }
    post(id: string): Promise<AdminPost> {
        return this.request(`admin/posts/${encodeURIComponent(id)}`);
    }
    savePost(post: AdminPost): Promise<AdminPost> {
        return this.request(
            `admin/posts/${encodeURIComponent(post.id)}`,
            this.json('PUT', post),
        );
    }
    importArchive(file: File, review = false): Promise<PostArchiveReview> {
        if (file.size > MAX_ARCHIVE_BYTES) throw new Error('El ZIP supera los 32 MB permitidos.');
        return this.request(review ? 'admin/import/zip/review' : 'admin/import/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/zip' },
            body: file,
        });
    }
    async listComments(): Promise<AdminComment[]> {
        return (
            await this.request<{ comments: AdminComment[] }>('comments/admin')
        ).comments;
    }
    removeComment(comment: AdminComment): Promise<void> {
        return this.request(
            `comments/${encodeURIComponent(comment.postId)}/${comment.id}`,
            { method: 'DELETE' },
        );
    }
    listMedia(): Promise<MediaItem[]> {
        return this.request('admin/media');
    }
    async uploadImage(blob: Blob): Promise<string> {
        if (blob.size > 8 * 1024 * 1024)
            throw new Error('La imagen supera los 8 MB permitidos.');
        const result = await this.request<{ url: string }>('admin/media', {
            method: 'POST',
            headers: {
                'Content-Type': blob.type,
                'X-File-Name': encodeURIComponent(
                    blob instanceof File ? blob.name : 'Imagen',
                ),
            },
            body: blob,
        });
        return result.url;
    }
}
