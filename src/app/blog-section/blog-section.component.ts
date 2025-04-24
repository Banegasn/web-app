import { Component, inject } from '@angular/core';
import { PostsService } from '../services/posts.service';
import { BlogPostCardComponent } from '../blog-post-card/blog-post-card.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '../shared/components/button/button.component';

@Component({
    selector: 'app-blog-section',
    imports: [BlogPostCardComponent, ButtonComponent],
    templateUrl: './blog-section.component.html'
})
export class BlogSectionComponent {
    postsService = inject(PostsService);
    posts = toSignal(this.postsService.getLatestPosts(3));
}