import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { GoalsService } from '../../services/goals.service';
import { Goal, GoalMovement, GoalWithMovements } from '../../models/goal.model';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';

interface GoalForm {
  name: string;
  description: string;
  target_amount: number;
  category: string;
  icon: string;
  color: string;
  target_date: string;
}

interface MovementForm {
  amount: number;
  description: string;
  type: 'deposit' | 'withdrawal';
}

interface IconOption {
  icon: string;
  name: string;
}

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './goals.html',
  styleUrl: './goals.css'
})
export class Goals implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  goals: Goal[] = [];
  activeGoals: Goal[] = [];
  completedGoals: Goal[] = [];
  selectedGoal: GoalWithMovements | null = null;

  // UI State
  loading = false;
  formVisible = false;
  movementFormVisible = false;
  editing: Goal | null = null;
  filterType: 'all' | 'active' | 'completed' = 'all';
  deleteConfirmId: string | null = null;
  deleteMovementConfirmId: string | null = null;

  // Form models
  model: GoalForm = this.getEmptyGoalModel();
  movementModel: MovementForm = this.getEmptyMovementModel();
  fieldErrors: { [k: string]: string } = {};
  movementErrors: { [k: string]: string } = {};

  // Available icons
  availableIcons: IconOption[] = [
    { icon: 'flag', name: 'Objetivo General' },
    { icon: 'flight', name: 'Viajes' },
    { icon: 'directions_car', name: 'Coche/Vehículo' },
    { icon: 'home', name: 'Casa' },
    { icon: 'shopping', name: 'Compra Mayor' },
    { icon: 'laptop', name: 'Tecnología' },
    { icon: 'school', name: 'Educación' },
    { icon: 'favorite', name: 'Salud' },
    { icon: 'savings', name: 'Ahorros' },
    { icon: 'card_giftcard', name: 'Regalos' },
    { icon: 'movie', name: 'Entretenimiento' },
    { icon: 'restaurant', name: 'Experiencias' },
    { icon: 'trending_up', name: 'Inversión' },
    { icon: 'business', name: 'Negocio' },
    { icon: 'sports_soccer', name: 'Deporte' }
  ];

  // Color palette
  colorPalette = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
  ];

  constructor(private goalsService: GoalsService) {}

  ngOnInit(): void {
    this.loadGoals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadGoals(): Promise<void> {
    this.loading = true;
    try {
      const { data, error } = await this.goalsService.list();
      if (error) {
        console.error('Error loading goals:', error);
        this.goals = [];
      } else {
        this.goals = data || [];
        this.updateFilteredGoals();
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      this.goals = [];
    } finally {
      this.loading = false;
    }
  }

  updateFilteredGoals(): void {
    this.activeGoals = this.goals.filter((g: Goal) => !g.is_completed);
    this.completedGoals = this.goals.filter((g: Goal) => g.is_completed);
  }

  getFilteredGoals(): Goal[] {
    switch (this.filterType) {
      case 'active':
        return this.activeGoals;
      case 'completed':
        return this.completedGoals;
      default:
        return this.goals;
    }
  }

  async selectGoal(goal: Goal): Promise<void> {
    const { data, error } = await this.goalsService.getWithMovements(goal.id!);
    if (!error) {
      this.selectedGoal = data;
    }
  }

  deselectGoal(): void {
    this.selectedGoal = null;
    this.movementFormVisible = false;
    this.movementModel = this.getEmptyMovementModel();
  }

  showGoalForm(edit?: Goal): void {
    if (edit) {
      this.editing = edit;
      this.model = {
        name: edit.name || '',
        description: edit.description || '',
        target_amount: edit.target_amount || 0,
        category: edit.category || 'general',
        icon: edit.icon || 'flag',
        color: edit.color || '#463397',
        target_date: edit.target_date ? edit.target_date.split('T')[0] : ''
      };
    } else {
      this.editing = null;
      this.model = this.getEmptyGoalModel();
    }
    this.fieldErrors = {};
    this.formVisible = true;
  }

  closeGoalForm(): void {
    this.formVisible = false;
    this.editing = null;
    this.model = this.getEmptyGoalModel();
    this.fieldErrors = {};
  }

  showMovementForm(): void {
    this.movementFormVisible = true;
    this.movementModel = this.getEmptyMovementModel();
    this.movementErrors = {};
  }

  closeMovementForm(): void {
    this.movementFormVisible = false;
    this.movementModel = this.getEmptyMovementModel();
    this.movementErrors = {};
  }

  validateGoalModel(): boolean {
    this.fieldErrors = {};
    if (!this.model.name || this.model.name.trim() === '') {
      this.fieldErrors['name'] = 'El nombre es requerido';
    }
    if (!this.model.target_amount || this.model.target_amount <= 0) {
      this.fieldErrors['target_amount'] = 'Ingrese un monto válido';
    }
    if (!this.model.color) {
      this.fieldErrors['color'] = 'Seleccione un color';
    }
    if (!this.model.icon) {
      this.fieldErrors['icon'] = 'Seleccione un icono';
    }
    return Object.keys(this.fieldErrors).length === 0;
  }

  validateMovementModel(): boolean {
    this.movementErrors = {};
    if (!this.movementModel.amount || this.movementModel.amount <= 0) {
      this.movementErrors['amount'] = 'Ingrese un monto válido';
    }
    return Object.keys(this.movementErrors).length === 0;
  }

  async saveGoal(): Promise<void> {
    if (!this.validateGoalModel()) return;

    this.loading = true;
    try {
      const goalData: Goal = {
        name: this.model.name,
        description: this.model.description,
        target_amount: this.model.target_amount,
        current_amount: this.editing?.current_amount || 0,
        category: this.model.category,
        icon: this.model.icon,
        color: this.model.color,
        target_date: this.model.target_date ? new Date(this.model.target_date).toISOString() : undefined,
        is_completed: this.editing?.is_completed || false
      };

      if (this.editing && this.editing.id) {
        const { error } = await this.goalsService.update(this.editing.id, goalData);
        if (error) {
          console.error('Error updating goal:', error);
          alert('Error al actualizar el objetivo');
          return;
        }
      } else {
        const { error } = await this.goalsService.create(goalData);
        if (error) {
          console.error('Error creating goal:', error);
          alert('Error al crear el objetivo');
          return;
        }
      }
      this.closeGoalForm();
      await this.loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Error al guardar el objetivo');
    } finally {
      this.loading = false;
    }
  }

  async saveMovement(): Promise<void> {
    if (!this.validateMovementModel() || !this.selectedGoal) return;

    this.loading = true;
    try {
      const movement: GoalMovement = {
        goal_id: this.selectedGoal.id!,
        amount: this.movementModel.amount,
        type: this.movementModel.type,
        description: this.movementModel.description
      };

      const { error: movementError } = await this.goalsService.addMovement(movement);
      if (movementError) {
        console.error('Error adding movement:', movementError);
        alert('Error al registrar el movimiento');
        return;
      }

      const newAmount =
        this.movementModel.type === 'deposit'
          ? this.selectedGoal.current_amount + this.movementModel.amount
          : Math.max(this.selectedGoal.current_amount - this.movementModel.amount, 0);

      const isCompleted = newAmount >= this.selectedGoal.target_amount;

      const { error: updateError } = await this.goalsService.update(this.selectedGoal.id!, {
        current_amount: newAmount,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : undefined
      });

      if (updateError) {
        console.error('Error updating goal amount:', updateError);
        alert('Error al actualizar el monto del objetivo');
        return;
      }

      this.closeMovementForm();
      await this.loadGoals();
      await this.selectGoal(this.selectedGoal);
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Error al guardar el movimiento');
    } finally {
      this.loading = false;
    }
  }

  async deleteGoal(id: string): Promise<void> {
    if (!confirm('¿Está seguro de que desea eliminar este objetivo?')) return;

    this.loading = true;
    try {
      const { error } = await this.goalsService.delete(id);
      if (error) {
        console.error('Error deleting goal:', error);
        alert('Error al eliminar el objetivo');
        return;
      }
      this.deleteConfirmId = null;
      this.deselectGoal();
      await this.loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Error al eliminar el objetivo');
    } finally {
      this.loading = false;
    }
  }

  async deleteMovement(movementId: string): Promise<void> {
    if (!this.selectedGoal || !confirm('¿Está seguro de que desea eliminar este movimiento?')) return;

    this.loading = true;
    try {
      const movement = this.selectedGoal.movements?.find((m) => m.id === movementId);
      if (!movement) return;

      const { error: deleteError } = await this.goalsService.deleteMovement(movementId);
      if (deleteError) {
        console.error('Error deleting movement:', deleteError);
        alert('Error al eliminar el movimiento');
        return;
      }

      const newAmount =
        movement.type === 'deposit'
          ? this.selectedGoal.current_amount - movement.amount
          : this.selectedGoal.current_amount + movement.amount;

      const { error: updateError } = await this.goalsService.update(this.selectedGoal.id!, {
        current_amount: Math.max(newAmount, 0)
      });

      if (updateError) {
        console.error('Error updating goal amount:', updateError);
        return;
      }

      this.deleteMovementConfirmId = null;
      await this.loadGoals();
      await this.selectGoal(this.selectedGoal);
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar el movimiento');
    } finally {
      this.loading = false;
    }
  }

  calculateProgress(goal: Goal): number {
    return this.goalsService.calculateProgress(goal.current_amount, goal.target_amount);
  }

  calculateRemaining(goal: Goal): number {
    return this.goalsService.calculateRemainingAmount(goal.current_amount, goal.target_amount);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('es-AR', options);
  }

  private getEmptyGoalModel(): GoalForm {
    return {
      name: '',
      description: '',
      target_amount: 0,
      category: 'general',
      icon: 'flag',
      color: '#463397',
      target_date: ''
    };
  }

  private getEmptyMovementModel(): MovementForm {
    return {
      amount: 0,
      description: '',
      type: 'deposit'
    };
  }
}
