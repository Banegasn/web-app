import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-button',
    styles: `
        :host {
            display: inline-block;
        }
    `,
    imports: [RouterLink],
    templateUrl: './button.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
    readonly link = input.required<string | unknown[]>();
    readonly text = input.required<string>();
} 