import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { MediaItem } from './admin.models';

@Injectable()
export class MediaStore {
    private readonly api = inject(AdminApiService);
    private readonly uploads = signal(0);
    readonly items = signal<MediaItem[]>([]);
    readonly uploading = computed(() => this.uploads() > 0);
    readonly error = signal('');
    async refresh(): Promise<void> {
        this.error.set('');
        try {
            this.items.set(await this.api.listMedia());
        } catch (error) {
            this.error.set((error as Error).message);
        }
    }
    async upload(blob: Blob): Promise<string> {
        this.uploads.update((count) => count + 1);
        try {
            const url = await this.api.uploadImage(blob);
            await this.refresh();
            return url;
        } finally {
            this.uploads.update((count) => count - 1);
        }
    }
}
