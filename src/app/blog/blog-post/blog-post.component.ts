import { Component, input, ElementRef, Renderer2, effect, viewChild, ChangeDetectionStrategy, inject, ViewEncapsulation, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, DOCUMENT, DatePipe } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../components/button/button.component';
import { Post } from '../../models/post.model';
import { Router } from '@angular/router';
import { marked } from 'marked';
import { ShareDialogComponent } from '../../components/share/share.dialog.component';

@Component({
    selector: 'app-blog-post',
    host: { class: 'blog-post' },
    imports: [DatePipe, ButtonComponent],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./blog-post.component.css'],
    templateUrl: './blog-post.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostComponent implements OnDestroy {
    readonly post = input.required<Post>();

    readonly markdownContent = viewChild<ElementRef<HTMLDivElement>>('markdownContent');

    private readonly renderer = inject(Renderer2);
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly dialog = inject(Dialog);

    constructor() {
        effect(() => {
            const post = this.post();
            const element = this.markdownContent()?.nativeElement;

            if (post) {
                // --- SEO Meta Tag Updates ---
                const postTitle = post.title;
                this.titleService.setTitle('banegasn.dev | ' + postTitle);

                const description = post.summary;
                const origin = this.document.location.origin;
                const canonicalUrl = origin + this.router.url;
                const imageUrl = post.imageUrl ? `${origin}/${post.imageUrl}` : `${origin}/images/default.png`;

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

    sharePost(): void {
        const currentUrl = this.document.location.href;
        this.dialog.open<string>(ShareDialogComponent, {
            data: { shareUrl: currentUrl },
            width: '450px',
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