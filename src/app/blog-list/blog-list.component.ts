import { Component, inject } from '@angular/core';
import { PostsService } from '../services/posts.service';
import { BlogPostCardComponent } from '../blog-post-card/blog-post-card.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from "../shared/components/button/button.component";

@Component({
    selector: 'app-blog-list',
    standalone: true,
    imports: [BlogPostCardComponent, ButtonComponent],
    styleUrls: ['./blog-list.component.css'],
    templateUrl: './blog-list.component.html',
})
export class BlogListComponent {
    postsService = inject(PostsService);
    posts = toSignal(this.postsService.getAllPosts());
} 