import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, input, output, viewChild } from '@angular/core';
import { BlogPostComponent } from '../../../blog/blog-post/blog-post.component';
import type { PostArticle } from '../../../models/post.model';
import type { AdminPost } from '../data/admin.models';

/** Authenticated editor-only preview; never saves or exposes a public draft URL. */
@Component({
    selector: 'app-post-preview',
    imports: [BlogPostComponent],
    templateUrl: './post-preview.component.html',
    styleUrl: './post-preview.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostPreviewComponent implements AfterViewInit, OnDestroy {
    readonly post = input.required<AdminPost>();
    readonly closed = output<void>();
    readonly surface = viewChild.required<ElementRef<HTMLDialogElement>>('surface');
    readonly article = computed<PostArticle>(() => ({
        post: { ...this.post(), createdAt: new Date(this.post().createdAt) },
        translations: [],
    }));
    private previousOverflow = '';
    ngAfterViewInit(): void {
        const dialog = this.surface().nativeElement;
        this.previousOverflow = dialog.ownerDocument.body.style.overflow;
        dialog.ownerDocument.body.style.overflow = 'hidden';
        dialog.showModal();
    }
    dismiss(event?: Event): void {
        event?.preventDefault();
        this.closed.emit();
    }
    ngOnDestroy(): void {
        const dialog = this.surface().nativeElement;
        dialog.close();
        dialog.ownerDocument.body.style.overflow = this.previousOverflow;
    }
}
