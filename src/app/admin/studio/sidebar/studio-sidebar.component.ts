import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudioSection } from '../data/admin.models';
@Component({
    selector: 'app-studio-sidebar',
    imports: [RouterLink],
    styleUrl: './studio-sidebar.component.css',
    templateUrl: './studio-sidebar.component.html',
})
export class StudioSidebarComponent {
    readonly section = input.required<StudioSection>();
    readonly postCount = input(0);
    readonly commentCount = input(0);
    readonly navigate = output<StudioSection>();
    readonly logout = output<void>();
}
