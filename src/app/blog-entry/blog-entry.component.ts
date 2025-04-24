import { Component, input, ElementRef, Renderer2, effect, viewChild, ChangeDetectionStrategy, inject, ViewEncapsulation } from '@angular/core';
import { Post } from '../models/blog-post.model';
import { marked } from 'marked';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from "../shared/components/button/button.component";

@Component({
    selector: 'app-blog-entry',
    host: { class: 'blog-entry' },
    standalone: true,
    imports: [DatePipe, ButtonComponent],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./blog-entry.component.css'],
    templateUrl: './blog-entry.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush // Optional: Optimize change detection
})
export class BlogEntryComponent {
    post = input.required<Post>();

    markdownContent = viewChild<ElementRef<HTMLDivElement>>('markdownContent');

    private renderer = inject(Renderer2);

    constructor() {

        effect(() => {
            const post = this.post();
            const element = this.markdownContent()?.nativeElement;

            if (post && element) {
                if (typeof marked === 'function') {
                    const htmlContent = marked(post.content);
                    this.renderer.setProperty(element, 'innerHTML', htmlContent);
                } else {
                    this.renderer.setProperty(element, 'textContent', post.content);
                    console.warn('Marked function not available yet. Displaying raw content.');
                }
            }
        });
    }
}