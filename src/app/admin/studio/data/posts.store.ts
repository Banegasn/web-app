import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { AdminPostSummary } from './admin.models';

@Injectable()
export class PostsStore {
    private readonly api = inject(AdminApiService);
    readonly posts = signal<AdminPostSummary[]>([]);
    readonly published = computed(
        () => this.posts().filter((post) => post.published).length,
    );
    readonly loading = signal(false);
    readonly error = signal('');
    async refresh(): Promise<void> {
        this.loading.set(true);
        this.error.set('');
        try {
            this.posts.set(await this.api.listPosts());
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.loading.set(false);
        }
    }
}
