import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { inject } from '@angular/core';
import { PostsService } from './services/posts.service';

export const routes: Routes = [
    {
        path: 'blog',
        loadComponent: () => import('./blog-list/blog-list.component').then(m => m.BlogListComponent)
    },
    {
        path: 'blog/:id',
        resolve: {
            post: (route: ActivatedRouteSnapshot) => {
                const postsService = inject(PostsService);
                return postsService.getPostById(route.params['id']);
            }
        },
        loadComponent: () => import('./blog-entry/blog-entry.component').then(m => m.BlogEntryComponent)
    },
    { path: '', component: HomeComponent },
    { path: '**', redirectTo: '/' }
];
