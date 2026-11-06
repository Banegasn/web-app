import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { PostsService } from './services/posts.service';

export const routes: Routes = [
    {
        path: 'tools/seo',
        data: { language: 'es' },
        loadComponent: () => import('./tools/seo/seo-tool.component').then(m => m.SeoToolComponent)
    },
    {
        path: 'tools/seo/en',
        data: { language: 'en' },
        loadComponent: () => import('./tools/seo/seo-tool.component').then(m => m.SeoToolComponent)
    },
    {
        path: 'admin/comments',
        loadComponent: () => import('./admin/comments-admin/comments-admin.component').then(m => m.CommentsAdminComponent)
    },
    {
        path: 'blog',
        resolve: {
            posts: () => {
                const postsService = inject(PostsService);
                return postsService.getAllPosts({ limit: 25 });
            }
        },
        loadComponent: () => import('./blog/blog-list/blog-list.component').then(m => m.BlogListComponent)
    },
    {
        path: 'blog/:id',
        resolve: {
            article: (route: ActivatedRouteSnapshot) => inject(PostsService).getArticle(route.params['id'])
        },
        loadComponent: () => import('./blog/blog-post/blog-post.component').then(m => m.BlogPostComponent)
    },
    {
        path: '',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
    },
    { path: '**', redirectTo: '/' }
];
