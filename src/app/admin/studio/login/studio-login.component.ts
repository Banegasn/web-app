import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminSessionService } from '../data/admin-session.service';
@Component({
    selector: 'app-studio-login',
    imports: [FormsModule, RouterLink],
    styleUrl: './studio-login.component.css',
    templateUrl: './studio-login.component.html',
})
export class StudioLoginComponent {
    readonly session = inject(AdminSessionService);
    username = '';
    password = '';
    async submit(): Promise<void> {
        const password = this.password;
        this.password = '';
        await this.session.login(this.username, password);
    }
}
