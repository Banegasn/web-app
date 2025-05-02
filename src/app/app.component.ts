import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NavbarComponent],
    template: `
        <app-navbar />
        <router-outlet />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent { }