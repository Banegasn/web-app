import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MAX_HTML_BYTES, SAMPLE_HTML, SeoLanguage, SeoReport, analyzeSeo } from './seo-analyzer';
import { SEO_COPY } from './seo-copy';
import { SAMPLE_HTML_EN } from './seo-sample.en';
import { scoreSeo } from './seo-score';
import { buildAgentPlan } from './seo-agent-prompt';
import { FindingGroup, SeoFindingsComponent } from './seo-findings.component';

@Component({
    selector: 'app-seo-tool',
    imports: [FormsModule, RouterLink, SeoFindingsComponent],
    templateUrl: './seo-tool.component.html',
    styleUrl: './seo-tool.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoToolComponent implements OnDestroy {
    readonly language: SeoLanguage = inject(ActivatedRoute).snapshot.data['language'] === 'en' ? 'en' : 'es';
    readonly copy = SEO_COPY[this.language];
    readonly articlePath = '/blog/seo-2027-ia-intencion-de-busqueda' + (this.language === 'en' ? '-en' : '');
    readonly html = signal('');
    readonly pageUrl = signal('');
    readonly query = signal('');
    readonly report = signal<SeoReport | null>(null);
    readonly score = computed(() => this.report() ? scoreSeo(this.report()!, this.language) : null);
    readonly agentPlan = computed(() => this.report() && this.score() ? buildAgentPlan(this.report()!, this.score()!, this.pageUrl(), this.language) : null);
    readonly promptExpanded = signal(false);
    readonly copyMessage = signal('');
    readonly copyBusy = signal(false);
    readonly promptInput = viewChild<ElementRef<HTMLTextAreaElement>>('promptInput');
    readonly error = signal('');
    readonly busy = signal(false);
    readonly labels = { urgent: this.copy.urgent, review: this.copy.review, pending: this.copy.pending, info: this.copy.info, ok: this.copy.ok };
    readonly urlInput = viewChild<ElementRef<HTMLInputElement>>('urlInput');
    readonly resultTitle = viewChild<ElementRef<HTMLElement>>('resultTitle');
    readonly findingGroups = computed(() => {
        const findings = this.report()?.findings || [];
        const groups: FindingGroup[] = [
            { kind: 'issues', title: this.copy.issueGroup, description: this.copy.issueHelp, findings: findings.filter(f => f.status === 'urgent' || f.status === 'review') },
            { kind: 'pending', title: this.copy.pendingGroup, description: this.copy.pendingHelp, findings: findings.filter(f => f.status === 'pending') },
            { kind: 'info', title: this.copy.infoGroup, description: this.copy.infoHelp, findings: findings.filter(f => f.status === 'info') },
            { kind: 'ok', title: this.copy.okGroup, description: this.copy.okHelp, findings: findings.filter(f => f.status === 'ok') },
        ];
        return groups.filter(group => group.findings.length);
    });
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly titleService = inject(Title);
    private readonly meta = inject(Meta);
    private readonly canonical: HTMLLinkElement;
    private readonly previousCanonical: string | null;
    private readonly previousTitle = this.titleService.getTitle();
    private readonly previousLang = this.document.documentElement.lang;
    private readonly hreflang: HTMLLinkElement[] = [];
    private readonly canonicalUrl = 'https://banegasn.dev/tools/seo' + (this.language === 'en' ? '/en' : '');
    private readonly tags: MetaDefinition[] = [
        { name: 'description', content: this.copy.description },
        { property: 'og:title', content: this.copy.pageTitle },
        { property: 'og:description', content: this.copy.description },
        { property: 'og:url', content: this.canonicalUrl },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: this.language === 'en' ? 'en_US' : 'es_ES' },
        { name: 'twitter:title', content: this.copy.pageTitle },
        { name: 'twitter:description', content: this.copy.description },
    ];
    private readonly previousTags = this.tags.map(tag => {
        const selector = 'property' in tag ? `property="${tag.property}"` : `name="${tag.name}"`;
        return { selector, content: this.meta.getTag(selector)?.content };
    });
    private active = true;

    constructor() {
        this.titleService.setTitle(`${this.copy.pageTitle} | banegasn.dev`);
        this.document.documentElement.lang = this.language;
        this.tags.forEach(tag => this.meta.updateTag(tag));
        const existing = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        this.previousCanonical = existing?.getAttribute('href') ?? null;
        this.canonical = existing || this.document.createElement('link');
        this.canonical.rel = 'canonical';
        this.canonical.href = this.canonicalUrl;
        if (!existing) this.document.head.appendChild(this.canonical);
        for (const lang of ['es', 'en', 'x-default']) {
            const link = this.document.createElement('link');
            link.rel = 'alternate'; link.hreflang = lang;
            link.href = 'https://banegasn.dev/tools/seo' + (lang === 'en' ? '/en' : '');
            this.document.head.appendChild(link); this.hreflang.push(link);
        }
    }

    analyze(): void {
        this.error.set(''); this.report.set(null); this.copyMessage.set(''); this.promptExpanded.set(false);
        try {
            this.report.set(analyzeSeo(this.html(), this.pageUrl(), this.query(), this.language));
            afterNextRender(() => this.resultTitle()?.nativeElement.focus(), { injector: this.injector });
        } catch (error) {
            this.error.set(error instanceof Error ? error.message : this.copy.fileError);
        }
    }

    sample(): void {
        const english = this.language === 'en';
        this.html.set(english ? SAMPLE_HTML_EN : SAMPLE_HTML);
        this.pageUrl.set('https://example.com/' + (english ? 'destinations/example-hotel-airport' : 'destinos/hotel-ejemplo-aeropuerto'));
        this.query.set(english ? 'example hotel airport transfer' : 'transfer Hotel Ejemplo aeropuerto');
        this.analyze();
    }

    async loadFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0]; input.value = '';
        if (!file) return;
        this.error.set(''); this.report.set(null);
        if (file.size > MAX_HTML_BYTES) { this.error.set(this.copy.sizeError); return; }
        this.busy.set(true);
        try {
            const text = await file.text();
            if (this.active) this.html.set(text);
        } catch { if (this.active) this.error.set(this.copy.fileError); }
        finally { if (this.active) this.busy.set(false); }
    }

    clear(): void {
        this.html.set(''); this.pageUrl.set(''); this.query.set(''); this.report.set(null); this.error.set('');
        this.copyMessage.set(''); this.promptExpanded.set(false);
    }

    focusUrl(): void {
        const input = this.urlInput()?.nativeElement;
        input?.scrollIntoView({ block: 'center' }); input?.focus({ preventScroll: true });
    }

    scoreColor(value: number | null): string {
        return value === null ? '#94a3b8' : value >= 80 ? '#10b981' : value >= 50 ? '#d97706' : '#dc2626';
    }

    async copyAgentPrompt(): Promise<void> {
        const prompt = this.agentPlan()?.prompt;
        if (!prompt) return;
        this.copyBusy.set(true); this.copyMessage.set('');
        try {
            const clipboard = this.document.defaultView?.navigator.clipboard;
            if (!clipboard) throw new Error('Clipboard unavailable');
            await clipboard.writeText(prompt);
            if (this.active && this.agentPlan()?.prompt === prompt) this.copyMessage.set(this.copy.promptCopied);
        } catch {
            if (this.active && this.agentPlan()?.prompt === prompt) {
                this.promptExpanded.set(true); this.copyMessage.set(this.copy.promptCopyError);
                afterNextRender(() => {
                    this.promptInput()?.nativeElement.focus(); this.promptInput()?.nativeElement.select();
                }, { injector: this.injector });
            }
        } finally { if (this.active) this.copyBusy.set(false); }
    }

    downloadAgentPrompt(): void {
        const prompt = this.agentPlan()?.prompt;
        if (prompt) this.downloadText(prompt, `seo-agent-prompt-${this.language}.txt`);
    }

    download(): void {
        const r = this.report(), s = this.score(), c = this.copy;
        if (!r || !s) return;
        const text = [
            `${c.exportTitle} · banegasn.dev`, new Date().toISOString(),
            `${c.urlLabel}: ${this.pageUrl() || '—'}`, `${c.queryLabel}: ${r.query || '—'}`, r.title,
            `${c.globalScore}: ${s.overall ?? '—'}/100`, `${c.coverage}: ${s.coverage}%`, c.scoreHelp,
            ...(s.blocked ? [c.blocked, c.blockedHelp] : []), '',
            ...s.areas.flatMap(area => [`${area.label}: ${area.score ?? '—'}/100 (${area.coverage}% ${c.measured})`,
                ...area.criteria.map(item => `${item.label}: ${item.ratio === null ? c.notMeasured : Math.round(item.ratio * 100) + '%'} (${c.weight}: ${item.weight})\n${c.evidence}: ${item.evidence}\n${c.action}: ${item.action}`), '']),
            c.methodologyText, c.methodologyLimits, '',
            ...r.findings.map(f => `[${this.labels[f.status]}] ${f.title}\n${c.found}: ${f.detail}\n${c.meaning}: ${f.why}\n${c.next}: ${f.action}${f.example ? `\n${c.example}\n${f.example}` : ''}\n`),
            ...r.linkExamples.map(link => `${link.text || c.emptyLink} → ${link.href}`), c.exportScope,
        ].join('\n');
        this.downloadText(text, `seo-report-${this.language}.txt`);
    }

    private downloadText(text: string, filename: string): void {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const anchor = this.document.createElement('a');
        anchor.href = url; anchor.download = filename; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    ngOnDestroy(): void {
        this.active = false;
        this.titleService.setTitle(this.previousTitle); this.document.documentElement.lang = this.previousLang;
        this.previousTags.forEach(tag => {
            if (tag.content === undefined) this.meta.removeTag(tag.selector);
            else this.meta.getTag(tag.selector)?.setAttribute('content', tag.content);
        });
        this.hreflang.forEach(link => link.remove());
        if (this.previousCanonical !== null) this.canonical.setAttribute('href', this.previousCanonical);
        else this.canonical.remove();
    }
}
