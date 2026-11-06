import { BootstrapContext } from '@angular/platform-browser';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import bootstrap from '../src/main.server';

// Runtime SSR waits for lazy-route activation. Build-time route extraction deliberately
// disables initial navigation, so its shared bootstrap must not wait for this event.
export default async function runtimeBootstrap(context: BootstrapContext) {
    const application = await bootstrap(context);
    const router = application.injector.get(Router);
    if (!router.navigated) {
        const navigation = await firstValueFrom(
            router.events.pipe(
                filter(
                    (event) =>
                        event instanceof NavigationEnd ||
                        event instanceof NavigationError,
                ),
            ),
        );
        if (navigation instanceof NavigationError) throw navigation.error;
    }
    return application;
}
