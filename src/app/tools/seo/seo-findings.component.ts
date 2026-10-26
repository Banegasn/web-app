import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Finding, SeoLanguage, SeoReport } from './seo-analyzer';
import { SEO_COPY } from './seo-copy';

export interface FindingGroup {
    kind: 'issues' | 'pending' | 'info' | 'ok';
    title: string; description: string; findings: Finding[];
}

@Component({
    selector: 'app-seo-findings',
    templateUrl: './seo-findings.component.html',
    styleUrl: './seo-findings.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoFindingsComponent {
    readonly groups = input.required<FindingGroup[]>();
    readonly report = input.required<SeoReport>();
    readonly language = input.required<SeoLanguage>();
    readonly requestUrl = output<void>();
    readonly copy = computed(() => SEO_COPY[this.language()]);
}
