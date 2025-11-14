import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { MobileNav } from '../mobile-nav/mobile-nav';
import { SidebarStateService } from '../../shared/sidebar-state.service';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterOutlet, Sidebar, MobileNav],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  constructor(public sidebarState: SidebarStateService) {}

  get isCollapsed(): boolean {
    return this.sidebarState.isCollapsed;
  }
}
