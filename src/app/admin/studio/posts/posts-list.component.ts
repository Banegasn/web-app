import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostsStore } from '../data/posts.store';
import { PostRowComponent } from './post-row.component';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';
@Component({
    selector: 'app-studio-posts',
    imports: [FormsModule, PostRowComponent, StudioFeedbackComponent],
    styleUrl: './posts-list.component.css',
    templateUrl: './posts-list.component.html',
})
export class PostsListComponent {
    readonly store = inject(PostsStore);
    readonly create = output<void>();
    readonly edit = output<string>();
    readonly query = signal('');
    readonly filter = signal<'all' | 'published' | 'draft'>('all');
    readonly filtered = computed(() =>
        this.store
            .posts()
            .filter(
                (post) =>
                    (this.filter() === 'all' ||
                        (this.filter() === 'published') === post.published) &&
                    `${post.title} ${post.id}`
                        .toLowerCase()
                        .includes(this.query().toLowerCase()),
            ),
    );
}
