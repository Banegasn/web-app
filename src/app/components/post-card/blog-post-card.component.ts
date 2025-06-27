import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../models/post.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-blog-post-card',
    imports: [DatePipe, RouterLink],
    templateUrl: './blog-post-card.component.html'
})
export class BlogPostCardComponent {
    readonly post = input<Post>();
} 