import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NavbarComponent],
    template: `
        @if (!router.url.startsWith('/admin')) {
            <app-navbar />
        }
        <router-outlet />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
    readonly router = inject(Router);
}
