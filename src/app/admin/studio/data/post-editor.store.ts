import { Injectable, inject, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { AdminPost, newPost, normalizePost } from './admin.models';
import { MediaStore } from './media.store';
import { PostsStore } from './posts.store';

/** Owns the draft independently of view lifecycles, including session expiry. */
@Injectable()
export class PostEditorStore {
    private readonly api = inject(AdminApiService);
    private readonly posts = inject(PostsStore);
    readonly media = inject(MediaStore);
    private generation = 0;
    private changeVersion = 0;
    readonly post = signal<AdminPost | null>(null);
    readonly loading = signal(false);
    readonly busy = signal(false);
    readonly dirty = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    tags = '';
    date = '';
    async open(id?: string): Promise<void> {
        const generation = ++this.generation;
        this.loading.set(true);
        this.post.set(null);
        this.error.set('');
        this.notice.set('');
        try {
            const post = normalizePost(
                id ? await this.api.post(id) : newPost(),
            );
            if (generation !== this.generation) return;
            this.post.set(post);
            this.tags = post.tags.join(', ');
            this.date = post.createdAt.slice(0, 10);
            this.dirty.set(false);
        } catch (error) {
            if (generation === this.generation)
                this.error.set((error as Error).message);
        } finally {
            if (generation === this.generation) this.loading.set(false);
        }
    }
    patch(changes: Partial<AdminPost>): void {
        const post = this.post();
        if (!post) return;
        this.changeVersion++;
        this.post.set({ ...post, ...changes });
        this.dirty.set(true);
    }
    updateTags(value: string): void {
        this.tags = value;
        this.changeVersion++;
        this.dirty.set(true);
    }
    updateDate(value: string): void {
        this.date = value;
        this.changeVersion++;
        this.dirty.set(true);
    }
    titleChanged(title: string): void {
        const post = this.post();
        if (!post) return;
        const id =
            post.revision === -1
                ? title
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 100)
                : post.id;
        this.patch({ title, id });
    }
    contentChanged(content: string): void {
        if (this.post()?.content !== content) this.patch({ content });
    }
    leave(): boolean {
        if (this.busy() || this.media.uploading()) return false;
        return (
            !this.dirty() ||
            window.confirm(
                'Hay cambios sin guardar. ¿Quieres salir y descartarlos?',
            )
        );
    }
    close(): void {
        this.generation++;
        this.loading.set(false);
        this.post.set(null);
        this.dirty.set(false);
        this.error.set('');
        this.notice.set('');
    }
    async save(published: boolean): Promise<void> {
        const post = this.post();
        if (!post || this.busy() || this.media.uploading()) return;
        const version = this.changeVersion;
        this.busy.set(true);
        this.error.set('');
        this.notice.set('');
        try {
            const result = await this.api.savePost({
                ...post,
                published,
                tags: this.tags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                createdAt:
                    this.date === post.createdAt.slice(0, 10)
                        ? post.createdAt
                        : new Date(this.date).toISOString(),
            });
            const changedDuringSave = this.changeVersion !== version;
            const current = this.post();
            this.post.set(
                changedDuringSave && current
                    ? {
                          ...current,
                          id: result.id,
                          revision: result.revision,
                          published: result.published,
                      }
                    : normalizePost(result),
            );
            this.dirty.set(changedDuringSave);
            this.notice.set(
                changedDuringSave
                    ? 'Versión guardada. Tienes cambios nuevos sin guardar.'
                    : published
                      ? 'Post publicado. Ya está disponible en el blog.'
                      : 'Borrador guardado. Solo tú puedes verlo.',
            );
            await this.posts.refresh();
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
        }
    }
    async uploadCover(file: File): Promise<void> {
        this.error.set('');
        try {
            this.patch({ imageUrl: await this.media.upload(file) });
            this.notice.set('Imagen subida.');
        } catch (error) {
            this.error.set((error as Error).message);
        }
    }
}
