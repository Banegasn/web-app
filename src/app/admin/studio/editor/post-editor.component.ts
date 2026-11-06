import { Component, HostListener, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostEditorStore } from '../data/post-editor.store';
import { MarkdownEditorComponent } from './markdown-editor.component';
import { PostPublishingComponent } from './post-publishing.component';
import { PostCoverComponent } from './post-cover.component';
import { PostSeoComponent } from './post-seo.component';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';
@Component({
    selector: 'app-studio-editor',
    imports: [
        FormsModule,
        MarkdownEditorComponent,
        PostPublishingComponent,
        PostCoverComponent,
        PostSeoComponent,
        StudioFeedbackComponent,
    ],
    styleUrl: './post-editor.component.css',
    templateUrl: './post-editor.component.html',
})
export class PostEditorComponent {
    readonly state = inject(PostEditorStore);
    readonly back = output<void>();
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
