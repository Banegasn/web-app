import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../data/admin-api.service';
import { PostsStore } from '../data/posts.store';
import { AdminPost } from '../data/admin.models';
import { MAX_IMPORT_BYTES, ImportedPost, parsePostImport } from './post-import';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';

export interface PostImportRequest {
    post: ImportedPost;
    existing?: AdminPost;
}
@Component({
    selector: 'app-studio-post-import',
    imports: [FormsModule, StudioFeedbackComponent],
    templateUrl: './post-import.component.html',
    styleUrl: './post-import.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostImportComponent {
    private readonly api = inject(AdminApiService);
    private readonly posts = inject(PostsStore);
    readonly imported = output<PostImportRequest>();
    readonly source = signal('');
    readonly error = signal('');
    readonly busy = signal(false);
    readonly filename = signal('');
    readonly preview = signal<ImportedPost | null>(null);
    readonly collision = computed(() =>
        this.posts.posts().find((post) => post.id === this.preview()?.id),
    );
    setSource(value: string): void {
        this.source.set(value);
        this.filename.set('');
        this.preview.set(null);
        this.error.set('');
    }
    review(): void {
        this.error.set('');
        this.preview.set(null);
        try {
            this.preview.set(parsePostImport(this.source()));
        } catch (error) {
            this.error.set((error as Error).message);
        }
    }
    async selectFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.busy.set(true);
        this.error.set('');
        try {
            if (file.size > MAX_IMPORT_BYTES)
                throw new Error(
                    'El archivo supera 1 MB. Sube las imágenes por separado.',
                );
            this.setSource(await file.text());
            this.filename.set(file.name);
            this.review();
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
            input.value = '';
        }
    }
    async load(update = false): Promise<void> {
        const post = this.preview();
        if (!post || this.busy()) return;
        if (!update && this.collision()) {
            this.error.set(
                'Ese slug ya existe. Cambia id o prepara una actualización del post existente.',
            );
            return;
        }
        this.busy.set(true);
        this.error.set('');
        try {
            const existing = update ? await this.api.post(post.id) : undefined;
            this.imported.emit({ post, existing });
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
        }
    }
}
