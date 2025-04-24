import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BlogSectionComponent } from '../blog-section/blog-section.component';
import { WelcomeComponent } from "../welcome/welcome.component";
import { IntroComponent } from "../intro/intro.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BlogSectionComponent,
    WelcomeComponent,
    IntroComponent
  ],
  template: `
    <div class="overflow-hidden min-h-full flex flex-col justify-center items-center p-4">
      <section class="home-intro-section">
        <app-welcome></app-welcome>
        <app-intro></app-intro>
      </section>
      <app-blog-section></app-blog-section>
    </div>
  `,
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent { }
