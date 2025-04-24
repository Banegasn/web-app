import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-button',
    styles: `
        :host {
            display: inline-block;
        }
    `,
    imports: [RouterLink],
    templateUrl: './button.component.html'
})
export class ButtonComponent {
    link = input.required<string | unknown[]>();
    text = input.required<string>();
} 