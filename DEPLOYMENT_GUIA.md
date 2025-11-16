# 🚀 Guía de Deployment - Sección de Gastos/Ingresos Fijos

## Prerequisitos

- Proyecto Supabase creado y configurado
- Angular 20+ instalado localmente
- Acceso al dashboard de Supabase
- Git configurado

---

## Paso 1: Ejecutar Migración SQL

### Opción A: Via Supabase Dashboard (Recomendado para desarrollo)

1. **Ir a Supabase Dashboard**
   - https://app.supabase.com
   - Seleccionar tu proyecto

2. **Ir a SQL Editor**
   - Click izquierdo → "SQL Editor"
   - Click en "New Query"

3. **Copiar el SQL**
   - Abrir archivo: `supabase/sql/007_create_scheduled_transactions.sql`
   - Copiar todo el contenido

4. **Ejecutar en Supabase**
   - Pegar en el SQL Editor
   - Click "RUN"
   - Esperar confirmación

5. **Verificar**
   ```sql
   SELECT * FROM scheduled_transactions LIMIT 1;
   ```
   Debería devolver estructura vacía (sin errores)

### Opción B: Via Supabase CLI (Para producción)

```bash
# Instalar Supabase CLI si no está
npm install -g supabase

# Loguear
supabase login

# Vincular proyecto
supabase link --project-ref your_project_ref

# Ejecutar migración
supabase db push

# O directamente:
cat supabase/sql/007_create_scheduled_transactions.sql | \
  psql "postgresql://user:password@host:port/database"
```

---

## Paso 2: Verificar Creación en BD

Ejecutar estas queries en Supabase → SQL Editor:

### Verificar Tabla
```sql
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_name = 'scheduled_transactions';
```

**Resultado esperado**: Una fila con `scheduled_transactions` en público

### Verificar Índices
```sql
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE tablename = 'scheduled_transactions'
ORDER BY indexname;
```

**Resultado esperado**: 6 índices listados

### Verificar Vistas
```sql
SELECT 
    table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'scheduled%';
```

**Resultado esperado**: 3 vistas listadas

### Verificar RLS
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'scheduled_transactions';
```

**Resultado esperado**: 4 políticas de RLS

---

## Paso 3: Actualizar Angular App

### 1. Verificar archivos creados

```bash
# Desde raíz del proyecto
ls -la src/app/pages/scheduled/
ls -la src/app/components/scheduled-card/
ls -la src/app/components/scheduled-modal/
ls -la src/app/services/scheduled-*.service.ts
```

Deberían existir todos los archivos.

### 2. Instalar dependencias (si necesario)

```bash
npm install
```

### 3. Compilar

```bash
ng build
```

Si hay errores, revisar la consola y resolver imports.

---

## Paso 4: Probar Localmente

### 1. Iniciar servidor de desarrollo

```bash
ng serve
# O usar el task:
npm start
```

### 2. Acceder a la aplicación

```
http://localhost:4200
```

### 3. Navegar a Scheduled

1. Login si es necesario
2. Click en menú → "Transacciones Programadas"
3. O ir directamente a: `http://localhost:4200/scheduled`

### 4. Crear un gasto fijo de prueba

1. Click "Nuevo Gasto"
2. Completar formulario:
   - Descripción: "Test Gasto Fijo"
   - Tipo: Gasto
   - Monto: 1000
   - Moneda: ARS
   - Categoría: Seleccionar alguna
   - Billetera: Seleccionar alguna
   - Frecuencia: Mensualmente
   - Fecha inicio: Hoy
3. Click "Crear"
4. Debería aparecer en la lista

### 5. Verificar ejecución automática

La transacción se ejecutará cuando:
- La fecha de `next_execution_date` sea <= NOW()
- El servicio verifique cada 5 minutos

Para testing más rápido:
```typescript
// En consola del navegador (DevTools)
// Obtener el servicio (requiere acceso a providers)
// O crear transacción con fecha de hoy

// Ejecutar manualmente (si se expone el método):
scheduledExecutionService.manuallyExecuteScheduled('transactionId')
```

### 6. Verificar en historial

1. Ir a "Transacciones"
2. Debería aparecer la transacción creada desde la programada
3. Verificar que tenga `recurring_id` apuntando a la programada

---

## Paso 5: Configuración Adicional (Opcional)

### Cambiar intervalo de verificación

En `src/app/services/scheduled-execution.service.ts`:

```typescript
// Cambiar de 5 minutos a otra frecuencia
private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Milisegundos

// Ejemplos:
// 1 minuto: 1 * 60 * 1000
// 10 minutos: 10 * 60 * 1000
// 1 hora: 60 * 60 * 1000
```

### Agregar logs detallados

En `src/app/services/scheduled-execution.service.ts`, descomentar o agregar:

```typescript
console.log('Verificando transacciones programadas pendientes...');
console.log(`Encontradas ${transactions.length} transacciones pendientes`);
```

---

## Paso 6: Deployment a Producción

### Build para producción

```bash
ng build --configuration production
```

### Desplegar

Según tu hosting:

**Vercel**
```bash
vercel deploy
```

**Netlify**
```bash
netlify deploy --prod
```

**Firebase Hosting**
```bash
firebase deploy
```

**Tu servidor**
```bash
# Copiar dist/ a servidor
scp -r dist/ user@server:/var/www/app/
```

---

## Troubleshooting

### Error: "Cannot find module scheduled-transactions.service"

**Causa**: Archivo no creado o mal ubicado

**Solución**:
```bash
# Verificar:
test -f src/app/services/scheduled-transactions.service.ts && echo "✓ Existe"

# Si no existe, crear manualmente desde plantilla
```

### Error: "Syntax error at or near "NOT""

**Causa**: PostgreSQL versión no soporta `CREATE TRIGGER IF NOT EXISTS`

**Solución**: Ya fue corregido en el SQL. Usar versión actualizada del archivo `007_create_scheduled_transactions.sql`

### Tabla no aparece en Supabase

**Causa**: SQL no ejecutó correctamente

**Solución**:
1. Revisar mensajes de error en Supabase Dashboard
2. Ejecutar nuevamente
3. Verificar permisos en usuario

### Componente no renderiza

**Causa**: Componente no standalone o falta import

**Verificar**:
```typescript
@Component({
  selector: 'app-scheduled',
  standalone: true,  // ← Debe estar
  imports: [        // ← Debe tener imports
    CommonModule,
    FormsModule,
    ...
  ],
  templateUrl: './scheduled.html',
  styleUrl: './scheduled.css'
})
```

### Transacciones no se ejecutan automáticamente

**Verificar**:
1. ✓ Servicio inyectado en App.ts
2. ✓ is_active = true en BD
3. ✓ next_execution_date <= NOW()
4. ✓ end_date es NULL o > NOW()
5. ✓ Consola del navegador sin errores

**Solución**:
```typescript
// En consola:
// Verificar que el servicio está activo
// Revisar errores en Network tab
// Ejecutar manualmente para testing
```

---

## Verificación Final

Checklist antes de lanzar a producción:

- [ ] SQL ejecutado sin errores
- [ ] Tabla `scheduled_transactions` existe en BD
- [ ] Índices creados (6 total)
- [ ] Vistas creadas (3 total)
- [ ] RLS Policies activas (4 total)
- [ ] App compila sin errores
- [ ] Página Scheduled accesible
- [ ] Crear gasto fijo funciona
- [ ] Editar funciona
- [ ] Eliminar funciona
- [ ] Pausar/Reanudar funciona
- [ ] Transacciones se ejecutan automáticamente
- [ ] Se reflejan en historial
- [ ] Se incluyen en gráficos
- [ ] Responsive design funciona

---

## Monitoreo en Producción

### Logs

Revisar en Supabase Dashboard:
- Logs → Realtime
- Logs → API calls
- Logs → Errors

### Queries lentas

```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%scheduled%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Transacciones ejecutadas

```sql
SELECT 
    id,
    description,
    last_execution_date,
    next_execution_date,
    is_active,
    created_at
FROM scheduled_transactions
WHERE last_execution_date IS NOT NULL
ORDER BY last_execution_date DESC
LIMIT 20;
```

---

## Rollback

Si necesitas revertir:

```sql
-- Eliminar tabla y todas sus dependencias
DROP TABLE IF EXISTS scheduled_transactions CASCADE;

-- Esto elimina automáticamente:
-- - Índices
-- - Triggers
-- - Vistas
-- - Políticas RLS
```

Luego remover archivos TypeScript del proyecto.

---

## Próximas Mejoras

- [ ] Integración con Cron Jobs (ejecutar en servidor)
- [ ] Webhooks para notificaciones
- [ ] Exportación de transacciones programadas
- [ ] Plantillas de transacciones
- [ ] Duplicación de series
- [ ] Alertas antes de ejecución

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0  
**Autor**: Equal Development Team
