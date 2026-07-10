import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, Renderer2, ViewEncapsulation, effect, inject, input, viewChild } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import hljs from 'highlight.js';
import 'highlight.js/styles/base16/default-dark.css';
import { marked } from 'marked';
import { ShareDialogComponent } from '../../components/share/share.dialog.component';
import { Post } from '../../models/post.model';

@Component({
    selector: 'app-blog-post',
    host: { class: 'blog-post' },
    imports: [DatePipe, RouterLink],
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
    private readonly dialog = inject(Dialog);
    private jsonLdScript?: HTMLScriptElement;

    constructor() {
        // Configure marked to use highlight.js for syntax highlighting
        marked.use({
            renderer: {
                code(this, args: { code?: string; lang?: string; text?: string; raw?: string }): string | false {
                    const code = args.text || args.code || '';
                    const lang = args.lang || 'plaintext';
                    const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
                    const highlighted = hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
                    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                },
                link(this, args: { href?: string | null; title?: string | null; tokens?: unknown[]; text?: string }): string {
                    const href = args.href || '#';
                    const text = args.text || href;
                    const titleAttr = args.title ? ` title="${args.title}"` : '';
                    if (href.startsWith('http://') || href.startsWith('https://')) {
                        return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
                    }
                    return `<a href="${href}"${titleAttr}>${text}</a>`;
                }
            }
        });

        effect(() => {
            const post = this.post();
            const element = this.markdownContent()?.nativeElement;

            if (post) {
                // --- SEO Meta Tag Updates ---
                const postTitle = post.seoTitle || post.title;
                this.titleService.setTitle(`${postTitle} | banegasn.dev`);

                const description = post.summary;
                const origin = this.getOrigin();
                const canonicalUrl = origin + this.router.url.split('?')[0].split('#')[0];
                const imageUrl = post.imageUrl ? `${origin}/${post.imageUrl}` : `${origin}/images/default.png`;
                const publishedTime = this.toIsoDate(post.createdAt);
                const modifiedTime = this.toIsoDate(post.updatedAt || post.createdAt);
                const keywords = post.keywords || post.tags?.join(', ');

                this.metaService.updateTag({ name: 'description', content: description });
                if (keywords) {
                    this.metaService.updateTag({ name: 'keywords', content: keywords });
                }
                this.metaService.updateTag({ property: 'og:title', content: postTitle });
                this.metaService.updateTag({ property: 'og:description', content: description });
                this.metaService.updateTag({ property: 'og:type', content: 'article' });
                this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
                this.metaService.updateTag({ property: 'og:image', content: imageUrl });
                this.metaService.updateTag({ property: 'og:site_name', content: 'banegasn.dev' });
                this.metaService.updateTag({ property: 'og:locale', content: post.language === 'en' ? 'en_US' : 'es_ES' });
                this.metaService.updateTag({ property: 'article:published_time', content: publishedTime });
                this.metaService.updateTag({ property: 'article:modified_time', content: modifiedTime });
                this.metaService.updateTag({ property: 'article:author', content: post.author || 'banegasn' });
                this.metaService.updateTag({ property: 'article:section', content: 'Software Development' });

                this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
                this.metaService.updateTag({ name: 'twitter:title', content: postTitle });
                this.metaService.updateTag({ name: 'twitter:description', content: description });
                this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });

                this.setCanonicalUrl(canonicalUrl);
                this.setJsonLd(post, canonicalUrl, imageUrl, publishedTime, modifiedTime, keywords);

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

    private getOrigin(): string {
        const origin = this.document.location.origin;
        return origin && origin !== 'null' ? origin : 'https://banegasn.dev';
    }

    private toIsoDate(date: Date | string): string {
        return new Date(date).toISOString();
    }

    private setCanonicalUrl(canonicalUrl: string): void {
        let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = this.renderer.createElement('link');
            this.renderer.setAttribute(link, 'rel', 'canonical');
            this.renderer.appendChild(this.document.head, link);
        }
        this.renderer.setAttribute(link, 'href', canonicalUrl);
    }

    private setJsonLd(post: Post, canonicalUrl: string, imageUrl: string, publishedTime: string, modifiedTime: string, keywords?: string): void {
        if (!this.jsonLdScript) {
            this.jsonLdScript = this.renderer.createElement('script');
            this.renderer.setAttribute(this.jsonLdScript, 'type', 'application/ld+json');
            this.renderer.appendChild(this.document.head, this.jsonLdScript);
        }

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.summary,
            image: [imageUrl],
            datePublished: publishedTime,
            dateModified: modifiedTime,
            author: {
                '@type': 'Person',
                name: post.author || 'banegasn',
                url: this.getOrigin(),
                sameAs: [
                    'https://github.com/Banegasn',
                    'https://banegasn.dev'
                ]
            },
            publisher: {
                '@type': 'Person',
                name: 'banegasn',
                url: this.getOrigin(),
                sameAs: [
                    'https://github.com/Banegasn',
                    'https://banegasn.dev'
                ]
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': canonicalUrl
            },
            keywords
        };

        this.renderer.setProperty(this.jsonLdScript, 'textContent', JSON.stringify(jsonLd));
    }

    ngOnDestroy() {
        // Remove all meta tags when component is destroyed
        this.metaService.removeTag('name="description"');
        this.metaService.removeTag('name="keywords"');
        this.metaService.removeTag('property="og:title"');
        this.metaService.removeTag('property="og:description"');
        this.metaService.removeTag('property="og:type"');
        this.metaService.removeTag('property="og:site_name"');
        this.metaService.removeTag('property="og:locale"');
        this.metaService.removeTag('property="og:url"');
        this.metaService.removeTag('property="og:image"');
        this.metaService.removeTag('property="article:published_time"');
        this.metaService.removeTag('property="article:modified_time"');
        this.metaService.removeTag('property="article:author"');
        this.metaService.removeTag('property="article:section"');
        this.metaService.removeTag('name="twitter:card"');
        this.metaService.removeTag('name="twitter:title"');
        this.metaService.removeTag('name="twitter:description"');
        this.metaService.removeTag('name="twitter:image"');
        if (this.jsonLdScript) {
            this.renderer.removeChild(this.document.head, this.jsonLdScript);
            this.jsonLdScript = undefined;
        }
        this.titleService.setTitle('banegasn.dev');
    }
} 
