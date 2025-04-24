import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BlogPostCardComponent } from '../../components/post-card/blog-post-card.component';
import { ButtonComponent } from "../../components/button/button.component";
import { Post } from '../../models/post.model';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';

@Component({
    selector: 'app-blog-list',
    standalone: true,
    imports: [BlogPostCardComponent, ButtonComponent, SearchBarComponent],
    styleUrls: ['./blog-list.component.css'],
    templateUrl: './blog-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogListComponent {
    readonly posts = input.required<Post[]>();
    readonly search = signal<string>('');

    readonly filteredPosts = computed(() => {
        const term = this.search()?.toLowerCase();
        if (!term) {
            return this.posts();
        }
        return this.posts().filter(post =>
            post.title.toLowerCase().includes(term) ||
            post.content.toLowerCase().includes(term)
        );
    });
} 