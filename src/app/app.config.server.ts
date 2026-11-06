import { provideServerRendering } from '@angular/ssr';
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { createServerPostsSource } from '../../server/posts-source';
import { POSTS_SOURCE } from './services/posts.service';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(),
        { provide: POSTS_SOURCE, useFactory: createServerPostsSource }
    ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
