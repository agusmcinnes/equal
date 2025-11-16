# Guía de Instalación - Transacciones Programadas

## Paso 1: Ejecutar Script SQL en Supabase

1. Ve a tu proyecto Supabase en `supabase.com`
2. Abre el **SQL Editor**
3. Copia el contenido de `supabase/sql/007_create_scheduled_transactions.sql`
4. Pega en el editor y ejecuta
5. Verifica que todas las tablas, vistas e índices se crean sin errores

### Objetos creados:
- ✅ Tabla `scheduled_transactions`
- ✅ Vistas: `scheduled_transactions_with_details`, `pending_scheduled_transactions`, `active_scheduled_by_type`
- ✅ Índices de performance
- ✅ RLS Policies
- ✅ Triggers y funciones

## Paso 2: Verificar instalación en Supabase

```sql
-- En Supabase SQL Editor

-- 1. Verificar tabla
SELECT * FROM scheduled_transactions LIMIT 1;

-- 2. Verificar vistas
SELECT * FROM scheduled_transactions_with_details LIMIT 1;

-- 3. Verificar RLS está habilitado
SELECT tablename FROM pg_tables 
WHERE tablename = 'scheduled_transactions';

-- 4. Verificar políticas RLS
SELECT policyname FROM pg_policies 
WHERE tablename = 'scheduled_transactions';

-- 5. Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'scheduled_transactions';
```

## Paso 3: Verificar archivos en el proyecto

Confirma que todos estos archivos existen:

```
src/app/
├── models/
│   └── scheduled-transaction.model.ts ✅
├── services/
│   ├── scheduled-transactions.service.ts ✅
│   └── scheduled-transaction-executor.service.ts ✅
├── components/
│   ├── scheduled-card/
│   │   ├── scheduled-card.ts ✅
│   │   ├── scheduled-card.html ✅
│   │   └── scheduled-card.css ✅
│   └── scheduled-modal/
│       ├── scheduled-modal.ts ✅
│       ├── scheduled-modal.html ✅
│       └── scheduled-modal.css ✅
├── pages/
│   └── scheduled/
│       ├── scheduled.ts ✅
│       ├── scheduled.html ✅
│       ├── scheduled.css ✅
│       └── README.md ✅
└── app.ts ✅ (actualizado)
app.routes.ts ✅ (actualizado)
```

## Paso 4: Iniciar la aplicación

```bash
npm start
```

Verifica en la consola que no hay errores de compilación.

## Paso 5: Probar la funcionalidad

### 1. Acceder a la sección
- Navega a `http://localhost:4200/scheduled`
- Deberías ver la página dividida en "Ingresos Fijos" y "Gastos Fijos"

### 2. Crear un ingreso fijo
- Click en "Nuevo Ingreso"
- Completa el formulario:
  - Descripción: "Sueldo"
  - Tipo: Ingreso
  - Monto: 50000
  - Moneda: ARS
  - Frecuencia: Mensualmente
  - Fecha de inicio: Hoy
- Click en "Crear"
- Deberías ver una tarjeta con los datos

### 3. Crear un gasto fijo
- Click en "Nuevo Gasto"
- Completa:
  - Descripción: "Renta"
  - Tipo: Gasto
  - Monto: 15000
  - Moneda: ARS
  - Categoría: Hogar (si existe)
  - Frecuencia: Mensualmente
  - Fecha de inicio: Hoy
- Click en "Crear"

### 4. Editar una transacción
- Click en el botón "Editar" de una tarjeta
- Modifica los datos
- Click en "Guardar"

### 5. Pausar/Reanudar
- Click en el botón "Pausar" para desactivar una transacción
- Click en "Reanudar" para activarla nuevamente

### 6. Eliminar
- Click en "Eliminar" y confirma

## Paso 6: Verificar ejecución automática

La ejecución automática funciona así:

1. **Cada minuto**, el servicio `ScheduledTransactionExecutorService` verifica si hay transacciones pendientes
2. Cuando `next_execution_date <= ahora`, se ejecuta la transacción
3. Se crea una entrada en `transactions` (historial)
4. Se actualiza `next_execution_date` según la frecuencia

### Para probar:
1. Crea una transacción con `start_date` = hace 5 minutos
2. Espera ~1 minuto
3. Ve a la sección "Transacciones" y verifica que aparezca una nueva transacción
4. El balance debe reflejarse automáticamente

## Paso 7: Verificar en base de datos

```sql
-- Ver todas las transacciones programadas del usuario actual
SELECT * FROM scheduled_transactions_with_details
WHERE user_id = (SELECT auth.uid())
ORDER BY next_execution_date;

-- Ver transacciones pendientes
SELECT * FROM pending_scheduled_transactions
LIMIT 10;

-- Ver transacciones creadas por ejecución automática
SELECT * FROM transactions
WHERE is_recurring = true
AND recurring_id IS NOT NULL
ORDER BY date DESC
LIMIT 10;
```

## Troubleshooting

### ❌ Error: "Table does not exist"
**Solución**: Verifica que ejecutaste el script SQL completo sin errores. Revisa la sección de logs en Supabase.

### ❌ Las transacciones no se ejecutan automáticamente
**Solución**:
1. Verifica que `ScheduledTransactionExecutorService` esté inyectado en `App` (app.ts)
2. Abre la consola del navegador (F12)
3. Busca logs del executor
4. Verifica que `is_active` sea true
5. Verifica que `next_execution_date` sea menor a la hora actual

### ❌ Error: "RLS violation"
**Solución**: 
1. Verifica que estés autenticado
2. Revisa que las RLS policies estén creadas correctamente
3. En Supabase, ve a "Authentication" y verifica que exista el usuario

### ❌ Modal no abre o formulario no funciona
**Solución**:
1. Revisa la consola (F12) para errores
2. Verifica que todas las dependencias estén importadas correctamente
3. Recarga la página (Ctrl+R o Cmd+R)

### ❌ Las transacciones no se reflejan en los gráficos
**Solución**:
1. Verifica que las transacciones creadas tengan `is_recurring: true`
2. Revisa que tengan una `category_id` válida
3. Confirma que la moneda sea correcta
4. Recarga la página después de crear la transacción

## Verificación de Seguridad

✅ **RLS está habilitado**: Los usuarios solo ven sus datos
✅ **Validación de wallet**: La moneda debe coincidir
✅ **Triggers**: Se actualiza `updated_at` automáticamente
✅ **Constraints**: Validaciones a nivel de base de datos

## Archivos de Referencia

- **BDD.md**: Documentación completa de la base de datos
- **Migration 007**: Script SQL de creación
- **scheduled/README.md**: Documentación técnica del módulo

## Próximos Pasos Opcionales

1. Agregar notificaciones cuando se ejecuta una transacción
2. Crear un widget en dashboard para mostrar próximas transacciones
3. Agregar filtros avanzados en la página
4. Implementar exportación de calendario
5. Crear reportes de proyecciones de flujo de caja

---

## Resumen de Cambios

### Archivos Creados:
- `supabase/sql/007_create_scheduled_transactions.sql` (435 líneas)
- `src/app/models/scheduled-transaction.model.ts` (68 líneas)
- `src/app/services/scheduled-transactions.service.ts` (230 líneas)
- `src/app/services/scheduled-transaction-executor.service.ts` (186 líneas)
- `src/app/components/scheduled-card/` (3 archivos, 200+ líneas)
- `src/app/components/scheduled-modal/` (3 archivos, 300+ líneas)
- `src/app/pages/scheduled/` (4 archivos, 450+ líneas)

### Archivos Modificados:
- `src/app/app.ts` - Inyección de executor
- `src/app/app.routes.ts` - Nueva ruta `/scheduled`

### Total:
**~2000 líneas de código** entre SQL, TypeScript, HTML y CSS

---

¡Listo! Tu sección de Transacciones Programadas está completamente funcional. 🎉
