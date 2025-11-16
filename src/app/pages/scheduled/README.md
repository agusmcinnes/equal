# Scheduled Transactions (Transacciones Programadas)

Módulo para gestionar transacciones programadas (gastos e ingresos fijos) con ejecución automática.

## Estructura

```
scheduled/
├── scheduled.ts              # Componente principal
├── scheduled.html            # Template
├── scheduled.css             # Estilos
└── README.md                 # Este archivo
```

## Características

### ✅ Funcionalidades Principales

- **Crear transacciones programadas**: Ingresos y gastos fijos con fecha de inicio y fin opcional
- **Editar transacciones**: Modificar los detalles de una transacción programada
- **Eliminar transacciones**: Remover transacciones programadas
- **Pausar/Reanudar**: Activar o desactivar transacciones sin eliminarlas
- **Layout dividido**: Secciones separadas para ingresos y gastos
- **Frecuencia flexible**: Diaria, semanal, mensual, trimestral, semestral, anual
- **Ejecución automática**: Se crean automáticamente en el historial cuando llega su fecha
- **Reflejo en balances**: Se consideran en estadísticas y gráficos como transacciones normales

### 🔄 Frecuencias Disponibles

- Diariamente
- Semanalmente
- Cada 2 semanas
- Mensualmente
- Trimestralmente
- Semestralmente
- Anualmente

## Componentes

### ScheduledComponent
Componente principal que gestiona:
- Carga de transacciones programadas
- Filtrado por tipo (ingreso/gasto)
- Gestión de modal de creación/edición
- Manejo de CRUD operations

**Props:**
```typescript
// Estado
isModalOpen: boolean;
modalMode: 'create' | 'edit';
selectedTransaction: ScheduledTransactionWithDetails | null;
isLoading: boolean;
errorMessage: string;
successMessage: string;

// Datos
allScheduledTransactions: ScheduledTransactionWithDetails[];
incomeTransactions: ScheduledTransactionWithDetails[];
expenseTransactions: ScheduledTransactionWithDetails[];
categories: Category[];
wallets: Wallet[];
```

### ScheduledCardComponent
Componente para mostrar una transacción programada con:
- Información de categoría y billetera
- Estado activo/inactivo
- Próxima fecha de ejecución
- Botones de editar, eliminar, pausar/reanudar

**Inputs:**
```typescript
transaction: ScheduledTransactionWithDetails;
```

**Outputs:**
```typescript
edit: EventEmitter<ScheduledTransactionWithDetails>;
delete: EventEmitter<string>;
toggle: EventEmitter<{ id: string; isActive: boolean }>;
```

### ScheduledModalComponent
Modal reutilizable para crear/editar transacciones programadas

**Inputs:**
```typescript
isOpen: boolean;
mode: 'create' | 'edit';
transaction: ScheduledTransactionWithDetails | null;
categories: Category[];
wallets: Wallet[];
defaultType: 'income' | 'expense';
```

**Outputs:**
```typescript
close: EventEmitter<void>;
save: EventEmitter<ScheduledTransaction>;
```

**Form Fields:**
- description (requerido)
- type (income/expense, requerido)
- amount (requerido, > 0)
- currency (requerido)
- category_id (opcional)
- wallet_id (opcional)
- start_date (requerido)
- end_date (opcional)
- frequency (requerido)

## Servicios

### ScheduledTransactionsService
Gestiona todas las operaciones CRUD con Supabase

**Métodos principales:**
```typescript
// Obtener transacciones
getUserScheduledTransactions(): Observable<ScheduledTransactionWithDetails[]>;
getScheduledTransactions(filters?: ScheduledTransactionFilters): Observable<ScheduledTransactionWithDetails[]>;
getScheduledTransactionById(id: string): Observable<ScheduledTransactionWithDetails | null>;
getPendingScheduledTransactions(): Observable<ScheduledTransactionWithDetails[]>;

// CRUD
createScheduledTransaction(transaction: ScheduledTransaction): Observable<ScheduledTransaction>;
updateScheduledTransaction(id: string, updates: Partial<ScheduledTransaction>): Observable<ScheduledTransaction>;
deleteScheduledTransaction(id: string): Observable<void>;

// Utilidades
deactivateScheduledTransaction(id: string): Observable<ScheduledTransaction>;
activateScheduledTransaction(id: string): Observable<ScheduledTransaction>;
calculateNextExecutionDate(currentDate: Date, frequency: string): Date;
getFrequencyLabel(frequency: string): string;
```

### ScheduledTransactionExecutorService
Ejecutor automático que:
- Verifica cada minuto si hay transacciones pendientes
- Crea automáticamente transacciones en el historial
- Actualiza la próxima fecha de ejecución
- Desactiva transacciones expiradas

**Métodos:**
```typescript
executeNow(transactionId: string): void;
getTimeUntilExecution(nextExecutionDate: string): string;
```

## Modelo de Datos

```typescript
interface ScheduledTransaction {
  id?: string;
  user_id?: string;
  description: string;
  category_id?: string | null;
  amount: number;
  currency: string;
  crypto_type?: string | null;
  wallet_id?: string | null;
  type: 'income' | 'expense';
  start_date: string;
  end_date?: string | null;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'bi-annual' | 'yearly';
  last_execution_date?: string | null;
  next_execution_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ScheduledTransactionWithDetails extends ScheduledTransaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  category_type?: string;
  wallet_name?: string;
  wallet_provider?: string;
}
```

## Base de Datos

### Tabla: scheduled_transactions
```sql
CREATE TABLE scheduled_transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL (FK auth.users),
  description text NOT NULL,
  category_id uuid (FK categories),
  amount numeric NOT NULL (> 0),
  currency varchar CHECK IN ('ARS', 'USD', 'EUR', 'CRYPTO'),
  wallet_id uuid (FK wallets),
  type text CHECK IN ('income', 'expense'),
  crypto_type varchar,
  start_date timestamp NOT NULL,
  end_date timestamp,
  frequency text CHECK IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'bi-annual', 'yearly'),
  last_execution_date timestamp,
  next_execution_date timestamp NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
```

### Índices
- `idx_scheduled_user_id`
- `idx_scheduled_user_type`
- `idx_scheduled_user_currency`
- `idx_scheduled_category`
- `idx_scheduled_wallet`
- `idx_scheduled_active_next_date` (partial)

### RLS Policies
- Usuarios solo ven sus propias transacciones programadas
- Usuarios solo pueden crear, editar y eliminar sus propias transacciones

### Vistas
- `scheduled_transactions_with_details`: Enriquecida con datos de categoría y billetera
- `pending_scheduled_transactions`: Transacciones pendientes de ejecutar
- `active_scheduled_by_type`: Agrupación por tipo para análisis

## Rutas

```
/scheduled -> ScheduledComponent
```

## Estilos

### Variables de Color
- Income: `#22c55e` (verde)
- Expense: `#ef4444` (rojo)
- Primary: `#6366f1` (índigo)

### Font
- `Poppins` (roboto fallback)

## Integración con Otros Módulos

### Statistics Service
Las transacciones programadas se reflejan automáticamente en:
- Gráficos de balance general
- Estadísticas mensuales
- Distribución por categoría

### Transactions Service
Las transacciones ejecutadas se crean automáticamente con:
- `is_recurring: true`
- `recurring_id: <id_de_la_transacción_programada>`

## Ejemplo de Uso

### Crear una transacción programada
```typescript
const newScheduled: ScheduledTransaction = {
  description: 'Pago de renta',
  type: 'expense',
  amount: 15000,
  currency: 'ARS',
  category_id: 'category-uuid',
  wallet_id: 'wallet-uuid',
  start_date: new Date().toISOString(),
  frequency: 'monthly',
  next_execution_date: new Date().toISOString(),
  is_active: true
};

this.scheduledService.createScheduledTransaction(newScheduled).subscribe(
  result => console.log('Creado:', result),
  error => console.error('Error:', error)
);
```

### Editar una transacción
```typescript
this.scheduledService.updateScheduledTransaction(transactionId, {
  amount: 16000,
  description: 'Pago de renta (actualizado)'
}).subscribe(
  result => console.log('Actualizado:', result),
  error => console.error('Error:', error)
);
```

### Pausar una transacción
```typescript
this.scheduledService.deactivateScheduledTransaction(transactionId).subscribe(
  result => console.log('Pausada:', result),
  error => console.error('Error:', error)
);
```

## Consideraciones de Performance

1. **Índices**: Las queries se benefician de los índices en `user_id`, `frequency` y `next_execution_date`
2. **Ejecución en segundo plano**: El executor corre cada minuto sin bloquear la UI
3. **Lazy loading**: Los datos se cargan bajo demanda
4. **RLS**: Filtra automáticamente por usuario en base de datos

## Mejoras Futuras

- [ ] Notificaciones cuando se ejecuta una transacción
- [ ] Edición en lote de múltiples transacciones
- [ ] Plantillas de transacciones comunes
- [ ] Histórico de ejecuciones
- [ ] Estadísticas de transacciones programadas vs reales
- [ ] Exportar calendario de transacciones futuras

## Testing

```typescript
// Mock del servicio
const mockScheduledService = {
  getUserScheduledTransactions: () => of([]),
  createScheduledTransaction: (t) => of(t),
  updateScheduledTransaction: (id, updates) => of(updates),
  deleteScheduledTransaction: (id) => of(void 0)
};

// En spec.ts
TestBed.configureTestingModule({
  providers: [
    { provide: ScheduledTransactionsService, useValue: mockScheduledService }
  ]
});
```

## Troubleshooting

### No se ejecutan las transacciones
- Verificar que `ScheduledTransactionExecutorService` esté inyectado en `App`
- Revisar la consola para errores del executor
- Verificar que `is_active` sea true y `next_execution_date` sea menor a ahora

### Errores de validación
- Verificar que la moneda coincida entre transacción y billetera
- Confirmar que start_date no es en el futuro si se espera ejecución inmediata
- Validar que el monto sea positivo

### Performance lento
- Revisar cantidad de transacciones programadas
- Considerar agregar más índices si hay queries complejas
- Usar `getPendingScheduledTransactions` en lugar de `getUserScheduledTransactions` para ejecución

---

**Última actualización:** Noviembre 2025
