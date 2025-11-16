import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-badge',
  templateUrl: './category-badge.html',
  styleUrls: ['./category-badge.css'],
  standalone: true,
  imports: [CommonModule]
})
export class CategoryBadgeComponent {
  @Input() name: string = '';
  @Input() icon: string = 'category';
  @Input() color: string = '#6b7280';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showLabel: boolean = true;
  @Input() clickable: boolean = false;

  get iconSize(): number {
    const sizes = {
      small: 16,
      medium: 20,
      large: 24
    };
    return sizes[this.size];
  }

  get badgeSize(): string {
    const sizes = {
      small: '28px',
      medium: '36px',
      large: '44px'
    };
    return sizes[this.size];
  }

  get textSize(): string {
    const sizes = {
      small: '12px',
      medium: '14px',
      large: '16px'
    };
    return sizes[this.size];
  }

  onClick(event: Event): void {
    if (this.clickable) {
      event.stopPropagation();
      // Parent can listen to click event
    }
  }
}
