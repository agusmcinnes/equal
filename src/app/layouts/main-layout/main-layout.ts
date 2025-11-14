import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { MobileNav } from '../mobile-nav/mobile-nav';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, MobileNav],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {

}
