import { ChangeDetectionStrategy, Component, HostListener, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostEditorStore } from '../data/post-editor.store';
import { MarkdownEditorComponent } from './markdown-editor.component';
import { PostPublishingComponent } from './post-publishing.component';
import { PostCoverComponent } from './post-cover.component';
import { PostSeoComponent } from './post-seo.component';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';
import { PostPreviewComponent } from './post-preview.component';
import type { AdminPost } from '../data/admin.models';
@Component({
    selector: 'app-studio-editor',
    imports: [
        FormsModule,
        MarkdownEditorComponent,
        PostPublishingComponent,
        PostCoverComponent,
        PostSeoComponent,
        StudioFeedbackComponent,
        PostPreviewComponent,
    ],
    styleUrl: './post-editor.component.css',
    templateUrl: './post-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostEditorComponent {
    readonly state = inject(PostEditorStore);
    readonly back = output<void>();
    readonly previewPost = signal<AdminPost | null>(null);
    showPreview(): void {
        try { this.previewPost.set(this.state.snapshot()); }
        catch { this.state.error.set('Revisa la fecha antes de abrir la vista previa.'); }
    }
    @HostListener('window:beforeunload', ['$event']) unload(
        event: BeforeUnloadEvent,
    ): void {
        if (
            this.state.dirty() ||
            this.state.busy() ||
            this.state.media.uploading()
        )
            event.preventDefault();
    }
}
