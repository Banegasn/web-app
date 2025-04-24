import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BlogPostCardComponent } from '../../components/post-card/blog-post-card.component';
import { ButtonComponent } from "../../components/button/button.component";
import { Post } from '../../models/post.model';

@Component({
    selector: 'app-blog-list',
    imports: [BlogPostCardComponent, ButtonComponent],
    styleUrls: ['./blog-list.component.css'],
    templateUrl: './blog-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogListComponent {
    posts = input.required<Post[]>();
} 