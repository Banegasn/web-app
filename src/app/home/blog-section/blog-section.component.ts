import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '../../components/button/button.component';
import { BlogPostCardComponent } from '../../components/post-card/blog-post-card.component';
import { PostsService } from '../../services/posts.service';

@Component({
    selector: 'app-blog-section',
    imports: [BlogPostCardComponent, ButtonComponent],
    templateUrl: './blog-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogSectionComponent {
    readonly postsService = inject(PostsService);
    readonly posts = toSignal(this.postsService.getLatestPosts(3));
}