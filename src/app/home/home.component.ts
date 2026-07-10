import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Renderer2, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { IntroComponent } from "../components/intro/intro.component";
import { BlogSectionComponent } from './blog-section/blog-section.component';

@Component({
    selector: 'app-home',
    imports: [
        BlogSectionComponent,
        IntroComponent
    ],
    template: `
        <div class="w-full">
            <app-intro/>
            <app-blog-section/>
        </div>
    `,
    styleUrls: ['./home.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly renderer = inject(Renderer2);

    constructor() {
        const origin = this.getOrigin();
        const canonicalUrl = `${origin}/`;
        const description = 'Banegasn is a software developer building TypeScript, Angular, Node.js, AI, automation, and cloud tooling projects.';

        this.titleService.setTitle('banegasn.dev | Software Developer and Project Builder');
        this.metaService.updateTag({ name: 'description', content: description });
        this.metaService.updateTag({ name: 'keywords', content: 'banegasn, software developer, TypeScript developer, Angular developer, Node.js developer, AI projects, cloud tools' });
        this.metaService.updateTag({ property: 'og:title', content: 'banegasn.dev | Software Developer and Project Builder' });
        this.metaService.updateTag({ property: 'og:description', content: description });
        this.metaService.updateTag({ property: 'og:type', content: 'website' });
        this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
        this.metaService.updateTag({ property: 'og:site_name', content: 'banegasn.dev' });
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.metaService.updateTag({ name: 'twitter:title', content: 'banegasn.dev | Software Developer and Project Builder' });
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
