# Siguientes Pasos - Aplicación de Finanzas Personales

**Fecha:** 15 de Noviembre de 2025
**Versión:** 1.0
**Stack:** Angular 20 + Supabase + TypeScript

---

## 📋 Estado Actual del Proyecto

### ✅ Funcionalidades Implementadas

#### 1. **Módulo de Transacciones** ✅ COMPLETO
- ✅ Listado de transacciones con paginación (20 por página)
- ✅ Creación de transacciones (ingresos y gastos)
- ✅ Edición de transacciones existentes
- ✅ Eliminación de transacciones con confirmación
- ✅ Filtrado automático: últimos 30 días, solo ARS
- ✅ Ordenamiento por fecha y monto
- ✅ Agrupación por períodos (Hoy, Ayer, Esta semana, etc.)

#### 2. **Estadísticas y Visualizaciones** ✅ COMPLETO
- ✅ Cards de estadísticas:
  - Total Ingresos
  - Total Gastos
  - Balance (con manejo correcto de negativos)
  - Cantidad de Transacciones
- ✅ Dos gráficos de torta:
  - Distribución de Ingresos por Categoría
  - Distribución de Gastos por Categoría
- ✅ Gráficos con tamaño fijo (600x600px) e igual tamaño
- ✅ Sin leyendas para diseño limpio
- ✅ Optimización: sin re-renders en hover

#### 3. **Categorías** ✅ COMPLETO
- ✅ Sistema de categorías personalizadas por usuario
- ✅ Categorías por defecto (seed automático)
- ✅ Badges visuales con iconos y colores
- ✅ Tipos: income y expense

#### 4. **Billeteras** ✅ COMPLETO
- ✅ Múltiples billeteras por usuario
- ✅ Soporte multi-moneda: ARS, USD, EUR, CRYPTO
- ✅ Validación de moneda entre transacción y billetera
- ✅ Proveedores: Mercado Pago, Ualá, Brubank, Cash, etc.

#### 5. **Base de Datos** ✅ COMPLETO
- ✅ 5 tablas principales: categories, wallets, transactions, recurring_transactions, default_categories
- ✅ 6 vistas optimizadas para consultas
- ✅ 8+ índices para performance
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Triggers para updated_at automático
- ✅ Validación de moneda con trigger
- ✅ Documentación completa en `BDD.md`

#### 6. **UI/UX** ✅ COMPLETO
- ✅ Diseño responsive (mobile, tablet, desktop)
- ✅ Fuente Poppins en toda la aplicación
- ✅ Tema de colores consistente (púrpura #463397)
- ✅ Animaciones suaves y transiciones
- ✅ Estados de carga y vacíos
- ✅ Componentes reutilizables:
  - StatCard
  - CategoryBadge
  - EmptyState

---

## 🚀 Siguientes Pasos Recomendados

### Prioridad ALTA 🔴

#### 1. **Dashboard Principal**
**Objetivo:** Crear página de inicio con resumen general

**Tareas:**
- [ ] Crear componente `dashboard.ts/html/css`
- [ ] Mostrar balance total de todas las billeteras
- [ ] Gráfico de tendencia mensual (últimos 6 meses)
- [ ] Top 5 categorías de gastos del mes
- [ ] Transacciones recientes (últimas 5)
- [ ] Accesos rápidos a crear transacción/billetera

**Archivos a crear:**
```
src/app/pages/dashboard/
  ├── dashboard.ts
  ├── dashboard.html
  └── dashboard.css
```

**Referencias:**
- Usar `StatisticsService` para obtener datos
- Reutilizar `StatCardComponent`
- Consultar `transaction_monthly_summary` view

---

#### 2. **Gestión de Billeteras**
**Objetivo:** CRUD completo de billeteras con resumen

**Tareas:**
- [ ] Crear página de listado de billeteras
- [ ] Modal de creación/edición de billetera
- [ ] Validación de campos (nombre, proveedor, moneda)
- [ ] Mostrar balance calculado por billetera
- [ ] Filtrar transacciones por billetera
- [ ] Eliminar billetera (con validación de transacciones asociadas)

**Archivos a crear:**
```
src/app/pages/wallets/
  ├── wallets.ts
  ├── wallets.html
  └── wallets.css
```

**Consideraciones:**
- No permitir eliminar billetera con transacciones (mostrar warning)
- Validar que la moneda de la billetera coincida con las transacciones
- Implementar paginación si hay muchas billeteras

---

#### 3. **Gestión de Categorías**
**Objetivo:** Permitir personalizar categorías

**Tareas:**
- [ ] Crear página de gestión de categorías
- [ ] Crear/editar/eliminar categorías
- [ ] Selector de color (color picker)
- [ ] Selector de icono (Material Icons)
- [ ] Separar categorías de ingresos y gastos
- [ ] No permitir eliminar categoría con transacciones asociadas

**Archivos a crear:**
```
src/app/pages/categories/
  ├── categories.ts
  ├── categories.html
  └── categories.css
```

**API a usar:**
- `CategoriesService.create()`
- `CategoriesService.update()`
- `CategoriesService.delete()`

---

### Prioridad MEDIA 🟡

#### 4. **Transacciones Recurrentes**
**Objetivo:** Automatizar transacciones que se repiten

**Tareas:**
- [ ] Crear tabla de plantillas recurrentes (YA EXISTE en DB)
- [ ] UI para crear transacción recurrente
- [ ] Patrones: diario, semanal, mensual, anual
- [ ] Servicio/función para generar transacciones automáticas
- [ ] Cron job o script para ejecutar generación
- [ ] Notificaciones de transacciones generadas

**Archivos a crear:**
```
src/app/pages/recurring/
  ├── recurring.ts
  ├── recurring.html
  └── recurring.css

src/app/services/recurring.service.ts
```

**Schema existente (usar):**
```sql
-- Tabla ya creada en migration 004
recurring_transactions (
  id, user_id, description, amount, currency,
  type, category_id, wallet_id, frequency,
  start_date, end_date, last_generated, is_active
)
```

---

#### 5. **Filtros Avanzados en Transacciones**
**Objetivo:** Permitir filtrar más allá de los últimos 30 días

**Tareas:**
- [ ] Agregar selector de rango de fechas personalizado
- [ ] Filtro por múltiples monedas (no solo ARS)
- [ ] Filtro por categorías (multi-select)
- [ ] Filtro por billeteras (multi-select)
- [ ] Búsqueda por descripción
- [ ] Guardar filtros favoritos en localStorage

**Componentes a crear:**
```
src/app/components/date-range-picker/
src/app/components/filter-chip/
```

**Consideraciones:**
- Ya existe código comentado/removido de filtros previos
- Revisar commit history para recuperar código base
- Mantener performance con muchas transacciones

---

#### 6. **Exportación de Datos**
**Objetivo:** Permitir exportar transacciones

**Tareas:**
- [ ] Exportar a CSV
- [ ] Exportar a Excel (XLSX)
- [ ] Exportar a PDF con gráficos
- [ ] Rango de fechas personalizado para export
- [ ] Filtrar por categoría/billetera antes de exportar

**Librerías recomendadas:**
```bash
npm install xlsx file-saver
npm install jspdf jspdf-autotable
```

**Archivos a crear:**
```
src/app/services/export.service.ts
```

---

### Prioridad BAJA 🟢

#### 7. **Metas de Ahorro**
**Objetivo:** Establecer y seguir metas financieras

**Tareas:**
- [ ] Crear modelo de metas (goals)
- [ ] CRUD de metas (nombre, monto objetivo, fecha límite)
- [ ] Progreso visual (barra de progreso)
- [ ] Vincular transacciones a metas específicas
- [ ] Notificaciones al alcanzar meta

**Schema propuesto:**
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  category_id UUID REFERENCES categories,
  is_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 8. **Presupuestos Mensuales**
**Objetivo:** Establecer límites de gasto por categoría

**Tareas:**
- [ ] Crear modelo de presupuestos
- [ ] Definir presupuesto por categoría y mes
- [ ] Alertas al acercarse al límite (80%, 100%)
- [ ] Gráfico de progreso del presupuesto
- [ ] Comparación mes actual vs mes anterior

**Schema propuesto:**
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  category_id UUID REFERENCES categories,
  month DATE NOT NULL, -- Primer día del mes
  limit_amount NUMERIC NOT NULL,
  spent_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 9. **Reportes y Analytics**
**Objetivo:** Insights avanzados de finanzas

**Tareas:**
- [ ] Reporte mensual automático
- [ ] Comparación año sobre año
- [ ] Tendencias de gastos por categoría
- [ ] Predicción de gastos futuros (ML básico)
- [ ] Gráficos adicionales:
  - Line chart de ingresos vs gastos
  - Bar chart de top categorías
  - Heatmap de gastos por día de semana

**Librerías:**
- Ya instalado: `@swimlane/ngx-charts`
- Considerar: Chart.js, ApexCharts

---

#### 10. **Notificaciones y Recordatorios**
**Objetivo:** Mantener usuario informado

**Tareas:**
- [ ] Sistema de notificaciones in-app
- [ ] Email notifications (Supabase Edge Functions)
- [ ] Recordatorios de facturas por vencer
- [ ] Resumen semanal por email
- [ ] Alertas de gastos inusuales

**Tecnologías:**
- Supabase Edge Functions para envío de emails
- SendGrid o Resend para emails
- Web Push Notifications (PWA)

---

## 🐛 Bugs Conocidos y Mejoras Pendientes

### Bugs Menores
- ⚠️ **Formato de fecha en modal:** El input `datetime-local` puede mostrar formato diferente en algunos navegadores
- ⚠️ **Timezone:** Las fechas pueden mostrar diferencia de zona horaria

### Mejoras de UX
- 💡 Agregar loading skeleton en lugar de spinner genérico
- 💡 Confirmación visual al crear/editar transacción (toast notification)
- 💡 Drag & drop para subir archivos de importación
- 💡 Dark mode (tema oscuro)
- 💡 Atajos de teclado (Ctrl+N para nueva transacción, etc.)

### Optimizaciones
- 🔧 Implementar virtual scrolling para listas muy largas
- 🔧 Lazy loading de módulos
- 🔧 Service Workers para PWA
- 🔧 Caché de consultas frecuentes

---

## 📚 Documentación y Recursos

### Documentación Existente
1. **BDD.md** - Documentación completa de base de datos
   - Schema de todas las tablas
   - Vistas y funciones
   - Políticas RLS
   - Migraciones SQL

2. **README.md** - Instrucciones de instalación (si existe)

### Recursos Útiles
- **Angular Docs:** https://angular.dev
- **Supabase Docs:** https://supabase.com/docs
- **Material Icons:** https://fonts.google.com/icons
- **ngx-charts:** https://swimlane.gitbook.io/ngx-charts

---

## 🛠️ Guía de Desarrollo

### Setup Inicial
```bash
# Clonar repo
git clone <repo-url>
cd equals

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# Correr migraciones de DB
# Ejecutar manualmente en Supabase SQL Editor:
# - supabase/migrations/001_initial_schema.sql
# - supabase/migrations/002_categories_and_wallets.sql
# - supabase/migrations/003_transactions_views.sql
# - supabase/migrations/004_recurring_transactions.sql
# - supabase/migrations/005_performance_indexes.sql

# Iniciar desarrollo
npm start
```

### Estructura de Archivos
```
src/
├── app/
│   ├── components/        # Componentes reutilizables
│   │   ├── stat-card/
│   │   ├── category-badge/
│   │   └── empty-state/
│   ├── pages/             # Páginas/Rutas
│   │   ├── transactions/  ✅ COMPLETO
│   │   ├── dashboard/     ⚠️ PENDIENTE
│   │   ├── wallets/       ⚠️ PENDIENTE
│   │   └── categories/    ⚠️ PENDIENTE
│   ├── services/          # Servicios de negocio
│   │   ├── transactions.service.ts
│   │   ├── categories.service.ts
│   │   ├── wallets.service.ts
│   │   └── statistics.service.ts
│   ├── models/            # Interfaces TypeScript
│   │   ├── transaction.model.ts
│   │   ├── category.model.ts
│   │   └── wallet.model.ts
│   └── core/              # Servicios core
│       ├── supabase.service.ts
│       └── auth.service.ts
└── assets/
```

### Convenciones de Código

#### Naming
- **Componentes:** PascalCase (`StatCardComponent`)
- **Archivos:** kebab-case (`stat-card.component.ts`)
- **Variables:** camelCase (`totalIncome`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_PAGE_SIZE`)

#### TypeScript
- Usar `interface` para modelos de datos
- Usar `type` para uniones y aliases
- Siempre tipar retornos de funciones
- Evitar `any`, usar `unknown` si es necesario

#### CSS
- Usar variables CSS para colores (`var(--color-primary)`)
- Fuente: Poppins en toda la app
- Mobile-first approach en media queries
- BEM naming opcional pero recomendado

#### Git
- Branch `main`: producción estable
- Branch `develop`: desarrollo activo
- Feature branches: `feature/nombre-feature`
- Fix branches: `fix/descripcion-bug`

**Commits:**
```
feat: agregar dashboard principal
fix: corregir cálculo de balance negativo
docs: actualizar README con instrucciones
refactor: optimizar carga de transacciones
```

---

## 🔐 Seguridad

### Consideraciones Importantes

1. **RLS Policies**
   - Todas las consultas están protegidas por Row Level Security
   - Usuarios solo pueden ver/modificar sus propios datos
   - Validar políticas antes de nuevas tablas

2. **Autenticación**
   - Usar `AuthService.currentUserValue` para obtener usuario actual
   - Nunca confiar en datos del cliente, validar en servidor
   - Tokens JWT manejados automáticamente por Supabase

3. **Validación**
   - Validar en frontend Y backend
   - No exponer credenciales en código
   - Usar variables de entorno para secrets

---

## 📊 Performance

### Métricas Actuales
- ✅ Carga inicial: ~2s (sin caché)
- ✅ Navegación entre páginas: <500ms
- ✅ Queries DB: <100ms (con índices)

### Recomendaciones
- Implementar lazy loading de módulos
- Usar `trackBy` en `*ngFor` para mejor performance
- Cachear consultas frecuentes (RxJS ReplaySubject)
- Comprimir imágenes y assets
- Implementar code splitting

---

## 🧪 Testing (Pendiente)

### Testing Recomendado
```bash
# Instalar dependencies
npm install --save-dev @angular/core/testing jasmine karma

# Unit tests
npm run test

# E2E tests
npm install --save-dev cypress
npm run e2e
```

### Casos de Prueba Prioritarios
- [ ] Crear transacción
- [ ] Editar transacción
- [ ] Eliminar transacción
- [ ] Filtros de transacciones
- [ ] Cálculo de estadísticas
- [ ] Autenticación y autorización

---

## 📱 PWA (Futuro)

### Convertir a Progressive Web App
```bash
ng add @angular/pwa
```

**Beneficios:**
- Instalable en dispositivos móviles
- Funciona offline
- Notificaciones push
- Carga más rápida

---

## 🤝 Contribución

### Para Nuevos Desarrolladores

1. **Leer documentación:**
   - Este archivo (`SIGUIENTES_PASOS.md`)
   - Base de datos (`BDD.md`)
   - Código existente en `src/app/pages/transactions/`

2. **Setup local:**
   - Seguir guía de instalación arriba
   - Crear cuenta en Supabase
   - Ejecutar migraciones

3. **Elegir tarea:**
   - Revisar sección "Siguientes Pasos Recomendados"
   - Empezar con tareas de PRIORIDAD ALTA
   - Asignar issue en GitHub/Jira/Trello

4. **Desarrollar:**
   - Crear branch desde `develop`
   - Escribir código siguiendo convenciones
   - Probar localmente
   - Commit con mensaje descriptivo

5. **Pull Request:**
   - Hacer PR a `develop`
   - Descripción clara de cambios
   - Screenshots si hay cambios visuales
   - Solicitar review

---

## 🆘 Contacto y Soporte

### Preguntas Frecuentes

**Q: ¿Cómo agrego una nueva migración SQL?**
A: Crear archivo en `supabase/migrations/` siguiendo numeración secuencial (006_nombre.sql)

**Q: ¿Dónde están las credenciales de Supabase?**
A: En archivo `.env` (no está en git). Pedir al líder del proyecto.

**Q: ¿Cómo debuggeo queries de Supabase?**
A: Usar consola de Supabase > Database > Query Performance. También ver logs en browser console.

**Q: ¿Puedo usar otra librería de gráficos?**
A: Sí, pero mantener consistencia. Documentar decisión.

---

## 📝 Changelog Reciente

### Versión 1.0 (15 Nov 2025)
- ✅ Módulo de transacciones completo
- ✅ Gráficos de distribución por categoría
- ✅ Estadísticas en tiempo real
- ✅ Base de datos documentada
- ✅ Diseño responsive con Poppins

### Próxima Versión 1.1 (Planeada)
- 🎯 Dashboard principal
- 🎯 Gestión de billeteras
- 🎯 Gestión de categorías
- 🎯 Filtros avanzados

---

## ✅ Checklist para Implementar Nueva Feature

```markdown
- [ ] Crear issue/ticket con descripción clara
- [ ] Diseñar UI/UX (mockup o sketch)
- [ ] Definir modelos TypeScript (interfaces)
- [ ] Crear/modificar schema de DB si necesario
- [ ] Implementar servicio Angular
- [ ] Crear componente(s)
- [ ] Escribir HTML y CSS
- [ ] Probar funcionalidad localmente
- [ ] Validar responsive design
- [ ] Optimizar performance
- [ ] Escribir tests (si aplica)
- [ ] Documentar en este archivo
- [ ] Commit y push
- [ ] Crear Pull Request
- [ ] Code review
- [ ] Merge a develop
- [ ] Probar en staging
- [ ] Deploy a producción
```

---

**¡Éxito con el desarrollo! 🚀**

_Última actualización: 15 de Noviembre de 2025_
