import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommentsStore } from '../data/comments.store';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';
import { CommentCardComponent } from './comment-card.component';
@Component({
    selector: 'app-studio-comments',
    imports: [FormsModule, CommentCardComponent, StudioFeedbackComponent],
    styleUrl: './comments-list.component.css',
    templateUrl: './comments-list.component.html',
})
export class CommentsListComponent {
    readonly store = inject(CommentsStore);
    readonly query = signal('');
    readonly filteredComments = computed(() =>
        this.store
            .comments()
            .filter((comment) =>
                `${comment.author} ${comment.body} ${comment.postId}`
                    .toLowerCase()
                    .includes(this.query().toLowerCase()),
            ),
    );
}
