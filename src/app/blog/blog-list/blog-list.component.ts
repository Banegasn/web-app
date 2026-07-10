import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Renderer2, computed, inject, input, signal } from '@angular/core';
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
export class BlogListComponent {
    readonly posts = input.required<Post[]>();
    readonly search = signal<string>('');

    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly renderer = inject(Renderer2);

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

        this.titleService.setTitle('Technical Articles and Project Writeups | banegasn.dev');
        this.metaService.updateTag({ name: 'description', content: description });
        this.metaService.updateTag({ name: 'keywords', content: 'software development blog, TypeScript articles, Angular articles, Node.js projects, AI engineering, cloud tooling' });
        this.metaService.updateTag({ property: 'og:title', content: 'Technical Articles and Project Writeups | banegasn.dev' });
        this.metaService.updateTag({ property: 'og:description', content: description });
        this.metaService.updateTag({ property: 'og:type', content: 'website' });
        this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
        this.metaService.updateTag({ property: 'og:site_name', content: 'banegasn.dev' });
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.metaService.updateTag({ name: 'twitter:title', content: 'Technical Articles and Project Writeups | banegasn.dev' });
        this.metaService.updateTag({ name: 'twitter:description', content: description });
        this.setCanonicalUrl(canonicalUrl);
    }

    private getOrigin(): string {
        const origin = this.document.location.origin;
        return origin && origin !== 'null' ? origin : 'https://banegasn.dev';
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
} 
