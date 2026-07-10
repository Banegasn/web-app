import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, Renderer2, computed, effect, inject, input, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BlogPostCardComponent } from '../../components/post-card/blog-post-card.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { Post } from '../../models/post.model';

@Component({
    selector: 'app-blog-list',
    standalone: true,
    imports: [BlogPostCardComponent, SearchBarComponent, RouterLink],
    styleUrls: ['./blog-list.component.css'],
    templateUrl: './blog-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogListComponent implements OnDestroy {
    readonly posts = input.required<Post[]>();
    readonly search = signal<string>('');

    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly renderer = inject(Renderer2);
    private jsonLdScript?: HTMLScriptElement;

    readonly filteredPosts = computed(() => {
        const term = this.search()?.toLowerCase();
        if (!term) {
            return this.posts();
        }
        return this.posts().filter(post =>
            post.title.toLowerCase().includes(term) ||
            post.content.toLowerCase().includes(term)
        );
    });

    constructor() {
        const origin = this.getOrigin();
        const canonicalUrl = `${origin}/blog`;
        const description = 'Technical articles and project writeups from Banegasn about TypeScript, Angular, Node.js, AI workflows, cloud tooling, and software architecture.';
        const imageUrl = `${origin}/images/welcome.png`;

        this.titleService.setTitle('Technical Articles and Project Writeups | banegasn.dev');
        this.metaService.updateTag({ name: 'description', content: description });
        this.metaService.updateTag({ name: 'keywords', content: 'software development blog, TypeScript articles, Angular articles, Node.js projects, AI engineering, cloud tooling' });
        this.metaService.updateTag({ property: 'og:title', content: 'Technical Articles and Project Writeups | banegasn.dev' });
        this.metaService.updateTag({ property: 'og:description', content: description });
        this.metaService.updateTag({ property: 'og:type', content: 'website' });
        this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
        this.metaService.updateTag({ property: 'og:image', content: imageUrl });
        this.metaService.updateTag({ property: 'og:site_name', content: 'banegasn.dev' });
        this.metaService.updateTag({ property: 'og:locale', content: 'en_US' });
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.metaService.updateTag({ name: 'twitter:title', content: 'Technical Articles and Project Writeups | banegasn.dev' });
        this.metaService.updateTag({ name: 'twitter:description', content: description });
        this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
        this.setCanonicalUrl(canonicalUrl);

        effect(() => {
            const posts = this.posts();
            if (posts.length) {
                this.setItemListJsonLd(posts, canonicalUrl);
            }
        });
    }

    private setItemListJsonLd(posts: Post[], canonicalUrl: string): void {
        if (!this.jsonLdScript) {
            this.jsonLdScript = this.renderer.createElement('script');
            this.renderer.setAttribute(this.jsonLdScript, 'type', 'application/ld+json');
            this.renderer.appendChild(this.document.head, this.jsonLdScript);
        }

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Technical Articles and Project Writeups',
            url: canonicalUrl,
            numberOfItems: posts.length,
            itemListElement: posts.map((post, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${canonicalUrl}/${post.id}`,
                name: post.title
            }))
        };

        this.renderer.setProperty(this.jsonLdScript, 'textContent', JSON.stringify(jsonLd));
    }

    private getOrigin(): string {
        const origin = this.document.location.origin;
        return origin && origin !== 'null' && origin.startsWith('https') ? origin : 'https://banegasn.dev';
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

    ngOnDestroy() {
        this.metaService.removeTag('name="description"');
        this.metaService.removeTag('name="keywords"');
        this.metaService.removeTag('property="og:title"');
        this.metaService.removeTag('property="og:description"');
        this.metaService.removeTag('property="og:type"');
        this.metaService.removeTag('property="og:url"');
        this.metaService.removeTag('property="og:image"');
        this.metaService.removeTag('property="og:site_name"');
        this.metaService.removeTag('property="og:locale"');
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
