import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Post } from '../models/blog-post.model';

@Component({
    selector: 'app-blog-post-card',
    imports: [DatePipe, RouterLink],
    templateUrl: './blog-post-card.component.html'
})
export class BlogPostCardComponent {
    post = input.required<Post>();
} 