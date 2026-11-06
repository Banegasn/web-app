import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, Renderer2, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, timer } from 'rxjs';
import { PostsService } from '../../services/posts.service';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BlogPostCardComponent } from '../../components/post-card/blog-post-card.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { PostSummary } from '../../models/post.model';

@Component({
    selector: 'app-blog-list',
    standalone: true,
    imports: [BlogPostCardComponent, SearchBarComponent, RouterLink],
    styleUrls: ['./blog-list.component.css'],
    templateUrl: './blog-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogListComponent implements OnDestroy {
    readonly posts = input.required<PostSummary[]>();
    readonly search = signal<string>('');

    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly renderer = inject(Renderer2);
    private jsonLdScript?: HTMLScriptElement;

    readonly page = signal(0);
    private readonly postsService = inject(PostsService);
    private readonly query = computed(() => ({ search: this.search().trim().slice(0, 200), page: this.page() }));
    private readonly results = toSignal(toObservable(this.query).pipe(
        switchMap(query => {
            if (!query.search && query.page === 0) return of({ posts: this.posts(), loading: false, error: false });
            return timer(query.search ? 250 : 0).pipe(
                switchMap(() => this.postsService.getAllPosts({ search: query.search, limit: 25, offset: query.page * 24 })),
                map(posts => ({ posts, loading: false, error: false })),
                catchError(() => of({ posts: [] as PostSummary[], loading: false, error: true })),
                startWith({ posts: [] as PostSummary[], loading: true, error: false }),
            );
        })
    ));
    readonly filteredPosts = computed(() => (this.results()?.posts ?? this.posts()).slice(0, 24));
    readonly hasMore = computed(() => (this.results()?.posts ?? this.posts()).length > 24);
    readonly loading = computed(() => this.results()?.loading ?? false);
    readonly searchError = computed(() => this.results()?.error ?? false);

    setSearch(value: string): void {
        this.search.set(value);
        this.page.set(0);
    }

    constructor() {
        const origin = this.getOrigin();
        const canonicalUrl = `${origin}/blog`;
        const description = 'Technical articles and project writeups from Banegasn about TypeScript, Angular, Node.js, AI workflows, cloud tooling, and software architecture.';
        const imageUrl = `${origin}/images/welcome.jpg`;

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
            const posts = this.filteredPosts();
            this.setItemListJsonLd(posts, canonicalUrl);
        });
    }

    private setItemListJsonLd(posts: PostSummary[], canonicalUrl: string): void {
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
