import { Clipboard } from '@angular/cdk/clipboard';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    computed,
    signal,
    inject,
    viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    buildAgentInstructions,
    examplePostPackage,
    metadataFields,
} from './agent-instructions';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';

@Component({
    selector: 'app-studio-agent-guide',
    imports: [FormsModule, StudioFeedbackComponent],
    templateUrl: './agent-guide.component.html',
    styleUrl: './agent-guide.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentGuideComponent {
    private readonly clipboard = inject(Clipboard);
    readonly fields = metadataFields;
    readonly packageExample = examplePostPackage(new Date().toISOString());
    readonly brief = signal('');
    readonly instructions = computed(() =>
        buildAgentInstructions(this.brief(), this.packageExample),
    );
    readonly notice = signal('');
    readonly expanded = signal(false);
    readonly promptField =
        viewChild<ElementRef<HTMLTextAreaElement>>('promptField');
    async copy(): Promise<void> {
        this.notice.set('');
        try {
            await navigator.clipboard.writeText(this.instructions());
            this.notice.set(
                'Instrucciones copiadas. Ya puedes pegarlas en tu agente.',
            );
        } catch {
            if (this.clipboard.copy(this.instructions())) {
                this.notice.set(
                    'Instrucciones copiadas. Ya puedes pegarlas en tu agente.',
                );
                return;
            }
            this.expanded.set(true);
            this.notice.set(
                'Copia el texto del campo «Instrucciones completas».',
            );
            // The readonly field is always mounted, including when its details are closed.
            this.promptField()?.nativeElement.select();
        }
    }
}
