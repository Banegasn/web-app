import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { PostsService } from './services/posts.service';

export const routes: Routes = [
    {
        path: 'blog',
        resolve: {
            posts: () => {
                const postsService = inject(PostsService);
                return postsService.getAllPosts();
            }
        },
        loadComponent: () => import('./blog/blog-list/blog-list.component').then(m => m.BlogListComponent)
    },
    {
        path: 'blog/:id',
        resolve: {
            post: (route: ActivatedRouteSnapshot) => {
                const postsService = inject(PostsService);
                return postsService.getPostById(route.params['id']);
            }
        },
        loadComponent: () => import('./blog/blog-post/blog-post.component').then(m => m.BlogPostComponent)
    },
    {
        path: 'chat',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent)
    },
    {
        path: 'chat/join/:token',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent)
    },
    {
        path: '',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
    },
    { path: '**', redirectTo: '/' }
];
