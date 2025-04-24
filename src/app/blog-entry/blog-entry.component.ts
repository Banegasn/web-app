import { Component, input, ElementRef, Renderer2, effect, viewChild, ChangeDetectionStrategy, inject, ViewEncapsulation, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, DOCUMENT, DatePipe } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Post } from '../models/blog-post.model';
import { marked } from 'marked';
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
export class BlogEntryComponent implements OnDestroy {
    post = input.required<Post>();

    markdownContent = viewChild<ElementRef<HTMLDivElement>>('markdownContent');

    private renderer = inject(Renderer2);
    private titleService = inject(Title);
    private metaService = inject(Meta);
    private router = inject(Router);
    private document = inject(DOCUMENT);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        effect(() => {
            const post = this.post();
            const element = this.markdownContent()?.nativeElement;

            if (post) {
                // --- SEO Meta Tag Updates ---
                const postTitle = post.title;
                this.titleService.setTitle('banegasn.dev | ' + postTitle);

                const description = post.summary;
                const canonicalUrl = this.document.location.origin + this.router.url;
                const imageUrl = post.imageUrl || `${this.document.location.origin}/assets/default-og-image.png`;

                this.metaService.updateTag({ name: 'description', content: description });
                this.metaService.updateTag({ property: 'og:title', content: postTitle });
                this.metaService.updateTag({ property: 'og:description', content: description });
                this.metaService.updateTag({ property: 'og:type', content: 'article' });
                this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
                this.metaService.updateTag({ property: 'og:image', content: imageUrl });
                this.metaService.updateTag({ property: 'og:site_name', content: 'banegasn.dev' });

                this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
                this.metaService.updateTag({ name: 'twitter:title', content: postTitle });
                this.metaService.updateTag({ name: 'twitter:description', content: description });
                this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });

                if (isPlatformBrowser(this.platformId)) {
                    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
                    if (link) {
                        this.renderer.setAttribute(link, 'href', canonicalUrl);
                    } else {
                        link = this.renderer.createElement('link');
                        this.renderer.setAttribute(link, 'rel', 'canonical');
                        this.renderer.setAttribute(link, 'href', canonicalUrl);
                        this.renderer.appendChild(this.document.head, link);
                    }
                }

                // --- Markdown Rendering ---
                if (element) {
                    if (typeof marked === 'function') {
                        const htmlContent = marked(post.content);
                        this.renderer.setProperty(element, 'innerHTML', htmlContent);
                    } else {
                        this.renderer.setProperty(element, 'textContent', post.content);
                        console.warn('Marked function not available yet. Displaying raw content.');
                    }
                }
            }
        });
    }

    ngOnDestroy() {
        // Remove all meta tags when component is destroyed
        this.metaService.removeTag('name="description"');
        this.metaService.removeTag('property="og:title"');
        this.metaService.removeTag('property="og:description"');
        this.metaService.removeTag('property="og:type"');
        this.metaService.removeTag('property="og:site_name"');
        this.metaService.removeTag('property="og:url"');
        this.metaService.removeTag('property="og:image"');
        this.metaService.removeTag('name="twitter:card"');
        this.metaService.removeTag('name="twitter:title"');
        this.metaService.removeTag('name="twitter:description"');
        this.metaService.removeTag('name="twitter:image"');
        this.titleService.setTitle('banegasn.dev');
    }
}