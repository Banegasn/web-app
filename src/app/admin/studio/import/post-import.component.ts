import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    output,
    signal,
    DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../data/admin-api.service';
import { PostsStore } from '../data/posts.store';
import { AdminPost } from '../data/admin.models';
import { MAX_IMPORT_BYTES, ImportedPost, parsePostImport } from './post-import';
import { PostArchiveReview } from './post-archive.models';
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
    readonly archiveReview = signal<PostArchiveReview | null>(null);
    private archive: File | null = null;
    private generation = 0;
    readonly collision = computed(() =>
        this.posts.posts().find((post) => post.id === this.preview()?.id),
    );
    constructor() {
        inject(DestroyRef).onDestroy(() => this.generation++);
    }
    setSource(value: string): void {
        this.generation++;
        this.archive = null;
        this.archiveReview.set(null);
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
        this.setSource('');
        const generation = this.generation;
        this.busy.set(true);
        this.error.set('');
        try {
            if (/\.zip$/i.test(file.name)) {
                const result = await this.api.importArchive(file, true);
                if (generation !== this.generation) return;
                this.archive = file;
                this.archiveReview.set(result);
                this.filename.set(file.name);
                this.preview.set(result.post);
                return;
            }
            if (file.size > MAX_IMPORT_BYTES)
                throw new Error(
                    'El archivo supera 1 MB. Sube las imágenes por separado.',
                );
            const source = await file.text();
            if (generation !== this.generation) return;
            this.source.set(source);
            this.filename.set(file.name);
            this.review();
        } catch (error) {
            if (generation === this.generation) this.error.set((error as Error).message);
        } finally {
            if (generation === this.generation) this.busy.set(false);
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
        const generation = this.generation;
        try {
            const existing = update ? await this.api.post(post.id) : undefined;
            if (generation !== this.generation) return;
            const imported = this.archive ? (await this.api.importArchive(this.archive)).post : post;
            if (generation !== this.generation) return;
            this.imported.emit({ post: imported, existing });
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
        }
    }
}
