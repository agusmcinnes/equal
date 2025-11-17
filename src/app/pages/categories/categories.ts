import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/category.model';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';

interface CategoryForm {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface IconOption {
  icon: string;
  name: string;
}

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  categories: Category[] = [];
  incomeCategories: Category[] = [];
  expenseCategories: Category[] = [];

  // UI State
  loading = false;
  formVisible = false;
  editing: Category | null = null;
  searchQuery = '';
  filterType: 'all' | 'income' | 'expense' = 'all';
  deleteConfirmId: string | null = null;

  // Form model
  model: CategoryForm = this.getEmptyModel();
  fieldErrors: { [k: string]: string } = {};

  // Available icons for Material Icons
  availableIcons: IconOption[] = [
    { icon: 'shopping_cart', name: 'Compras' },
    { icon: 'restaurant', name: 'Comida' },
    { icon: 'directions_car', name: 'Transporte' },
    { icon: 'home', name: 'Hogar' },
    { icon: 'favorite', name: 'Salud' },
    { icon: 'school', name: 'Educación' },
    { icon: 'movie', name: 'Entretenimiento' },
    { icon: 'flight', name: 'Viajes' },
    { icon: 'sports_soccer', name: 'Deportes' },
    { icon: 'work', name: 'Trabajo' },
    { icon: 'attach_money', name: 'Dinero' },
    { icon: 'savings', name: 'Ahorros' },
    { icon: 'card_giftcard', name: 'Regalos' },
    { icon: 'pets', name: 'Mascotas' },
    { icon: 'restaurant_menu', name: 'Restaurante' },
    { icon: 'local_bar', name: 'Bebidas' },
    { icon: 'build', name: 'Reparaciones' },
    { icon: 'trending_up', name: 'Ingresos' },
    { icon: 'business', name: 'Negocio' },
    { icon: 'card_travel', name: 'Tarjeta' }
  ];

  // Color palette
  colorPalette = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
  ];

  constructor(private catService: CategoriesService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadCategories(): Promise<void> {
    this.loading = true;
    try {
      const { data, error } = await this.catService.list();
      if (error) {
        console.error('Error loading categories:', error);
        this.categories = [];
      } else {
        this.categories = data || [];
        this.updateFilteredCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    } finally {
      this.loading = false;
    }
  }

  updateFilteredCategories(): void {
    this.incomeCategories = this.categories.filter((c: Category) => c.type === 'income');
    this.expenseCategories = this.categories.filter((c: Category) => c.type === 'expense');
  }

  getFilteredCategories(): Category[] {
    let filtered = this.categories;

    if (this.filterType !== 'all') {
      filtered = filtered.filter((c: Category) => c.type === this.filterType);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((c: Category) => c.name.toLowerCase().includes(query));
    }

    return filtered.sort((a: Category, b: Category) => (a.name || '').localeCompare(b.name || ''));
  }

  showForm(edit?: Category): void {
    if (edit) {
      this.editing = edit;
      this.model = {
        name: edit.name || '',
        type: edit.type || 'expense',
        color: edit.color || '#463397',
        icon: edit.icon || 'category'
      };
    } else {
      this.editing = null;
      this.model = this.getEmptyModel();
    }
    this.fieldErrors = {};
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editing = null;
    this.model = this.getEmptyModel();
    this.fieldErrors = {};
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  validateModel(): boolean {
    this.fieldErrors = {};
    if (!this.model.name || this.model.name.trim() === '') {
      this.fieldErrors['name'] = 'El nombre es requerido';
    }
    if (!this.model.type) {
      this.fieldErrors['type'] = 'Seleccione un tipo';
    }
    if (!this.model.color) {
      this.fieldErrors['color'] = 'Seleccione un color';
    }
    if (!this.model.icon) {
      this.fieldErrors['icon'] = 'Seleccione un icono';
    }
    return Object.keys(this.fieldErrors).length === 0;
  }

  async save(): Promise<void> {
    if (!this.validateModel()) return;

    this.loading = true;
    try {
      const categoryData: Category = {
        name: this.model.name,
        type: this.model.type,
        color: this.model.color,
        icon: this.model.icon
      };

      if (this.editing && this.editing.id) {
        const { error } = await this.catService.update(this.editing.id, categoryData);
        if (error) {
          console.error('Error updating category:', error);
          alert('Error al actualizar la categoría: ' + (typeof error === 'string' ? error : error.message));
          return;
        }
      } else {
        const { error } = await this.catService.create(categoryData);
        if (error) {
          console.error('Error creating category:', error);
          alert('Error al crear la categoría: ' + (typeof error === 'string' ? error : error.message));
          return;
        }
      }
      this.closeForm();
      await this.loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría');
    } finally {
      this.loading = false;
    }
  }

  async delete(id: string): Promise<void> {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) return;

    this.loading = true;
    try {
      const { error } = await this.catService.delete(id);
      if (error) {
        console.error('Error deleting category:', error);
        alert('Error al eliminar la categoría: ' + (typeof error === 'string' ? error : error.message));
        return;
      }
      this.deleteConfirmId = null;
      await this.loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar la categoría');
    } finally {
      this.loading = false;
    }
  }

  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Gasto';
  }

  getTypeIcon(type: string): string {
    return type === 'income' ? 'trending_up' : 'trending_down';
  }

  private getEmptyModel(): CategoryForm {
    return {
      name: '',
      type: 'expense',
      color: '#463397',
      icon: 'category'
    };
  }
}
