import { isPlatformBrowser } from '@angular/common';
import {
    Injectable,
    PLATFORM_ID,
    computed,
    inject,
    signal,
} from '@angular/core';
import { AdminApiService } from './admin-api.service';

@Injectable()
export class AdminSessionService {
    private readonly api = inject(AdminApiService);
    private readonly connected = signal(false);
    readonly authenticated = computed(
        () => this.connected() && !this.api.sessionExpired(),
    );
    readonly checking = signal(true);
    readonly busy = signal(false);
    readonly error = signal('');
    constructor() {
        if (isPlatformBrowser(inject(PLATFORM_ID))) void this.restore();
    }
    private async restore(): Promise<void> {
        try {
            await this.api.session();
            this.connected.set(true);
        } catch {
            /* A new browser starts at the login form. */
        } finally {
            this.checking.set(false);
        }
    }
    async login(username: string, password: string): Promise<void> {
        if (this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        try {
            await this.api.login(username, password);
            this.connected.set(true);
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
        }
    }
    async logout(): Promise<boolean> {
        this.error.set('');
        try {
            await this.api.logout();
            this.connected.set(false);
            return true;
        } catch (error) {
            if (this.api.sessionExpired()) {
                this.connected.set(false);
                return true;
            }
            this.error.set((error as Error).message);
            return false;
        }
    }
}
