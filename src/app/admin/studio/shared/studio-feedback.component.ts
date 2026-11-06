import { Component, input } from '@angular/core';
@Component({
    selector: 'app-studio-feedback',
    template: `
        @if (error()) {
            <div class="error" role="alert">{{ error() }}</div>
        }
        @if (notice()) {
            <div class="notice" role="status">{{ notice() }}</div>
        }
    `,
})
export class StudioFeedbackComponent {
    readonly error = input('');
    readonly notice = input('');
}
