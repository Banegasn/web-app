import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BlogSectionComponent } from './blog-section/blog-section.component';
import { IntroComponent } from "../components/intro/intro.component";

@Component({
  selector: 'app-home',
  imports: [
    BlogSectionComponent,
    IntroComponent
  ],
  template: `
    <div class="overflow-hidden min-h-full flex flex-col justify-center items-center p-4">
      <app-intro/>
      <app-blog-section/>
    </div>
  `,
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent { }
