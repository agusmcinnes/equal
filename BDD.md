# Base de Datos - Documentación Completa

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Tablas](#tablas)
3. [Vistas](#vistas)
4. [Índices](#índices)
5. [Funciones y Triggers](#funciones-y-triggers)
6. [Constraints](#constraints)
7. [Políticas RLS](#políticas-rls)
8. [Migraciones SQL](#migraciones-sql)
9. [Diagrama de Dependencias](#diagrama-de-dependencias)
10. [Guía de Deployment](#guía-de-deployment)

---

## Arquitectura General

El sistema utiliza **PostgreSQL** con **Supabase** para gestionar transacciones financieras de múltiples usuarios. La arquitectura implementa:

- **Multi-tenancy**: Usuarios aislados mediante Row Level Security (RLS)
- **Multi-moneda**: Soporte para ARS, USD, EUR y CRYPTO
- **Optimización de consultas**: Índices especializados y vistas pre-calculadas
- **Integridad de datos**: Constraints y triggers a nivel de base de datos
- **Seguridad**: RLS policies en todas las tablas

---

## Tablas

### 1. categories

Categorías de transacciones definidas por el usuario.

**Columnas:**

| Nombre     | Tipo                     | Descripción                                    |
|------------|--------------------------|------------------------------------------------|
| id         | uuid                     | ID único de la categoría (PK)                  |
| user_id    | uuid                     | ID del usuario propietario (FK a auth.users)   |
| name       | text                     | Nombre de la categoría                         |
| type       | text                     | Tipo: 'income' o 'expense'                     |
| color      | character varying        | Color en formato hex (#RRGGBB)                 |
| icon       | character varying        | Nombre del ícono de Material Icons             |
| created_at | timestamp with time zone | Fecha de creación                              |
| updated_at | timestamp with time zone | Fecha de última actualización                  |

**Índices:**
- `idx_categories_user_id` - Filtrado por usuario

**Triggers:**
- `trg_categories_updated_at` - Actualiza `updated_at` automáticamente

**RLS:** Habilitado (usuarios solo ven sus propias categorías)

---

### 2. default_categories

Plantillas de categorías predefinidas para nuevos usuarios.

**Columnas:**

| Nombre     | Tipo                     | Descripción                          |
|------------|--------------------------|--------------------------------------|
| id         | uuid                     | ID único de la categoría default (PK)|
| name       | text                     | Nombre de la categoría               |
| type       | text                     | Tipo: 'income' o 'expense'           |
| color      | character varying        | Color en formato hex                 |
| icon       | character varying        | Nombre del ícono                     |
| created_at | timestamp with time zone | Fecha de creación                    |

**Datos seed:**
- Salario (income)
- Freelance (income)
- Alimentos (expense)
- Transporte (expense)
- Hogar (expense)
- Salud (expense)

---

### 3. wallets

Cuentas financieras y billeteras de los usuarios.

**Descripción:** Representa cuentas bancarias, billeteras digitales, efectivo, cuentas crypto, etc.

**Columnas:**

| Nombre     | Tipo                     | Descripción                                           |
|------------|--------------------------|-------------------------------------------------------|
| id         | uuid                     | ID único de la billetera (PK)                         |
| user_id    | uuid                     | ID del usuario propietario (FK a auth.users)          |
| name       | text                     | Nombre de la billetera (ej: "Cuenta Brubank")         |
| provider   | text                     | Proveedor (ej: "Mercado Pago", "Ualá", "Cash")        |
| currency   | character varying        | Moneda: 'ARS', 'USD', 'EUR', 'CRYPTO'                 |
| balance    | numeric                  | Saldo inicial o actual (puede ser negativo)           |
| created_at | timestamp with time zone | Fecha de creación                                     |
| updated_at | timestamp with time zone | Fecha de última actualización                         |

**Índices:**
- `idx_wallets_user_id` - Filtrado por usuario
- `idx_wallets_user_currency` - Consultas por usuario y moneda

**Constraints:**
- `check_currency_valid` - Valida que currency sea ARS, USD, EUR o CRYPTO
- `check_provider_not_empty` - Provider no puede estar vacío
- `check_name_not_empty` - Name no puede estar vacío

**Triggers:**
- `trg_wallets_updated_at` - Actualiza `updated_at` automáticamente

**RLS:** Habilitado con 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

### 4. transactions

Registro individual de cada transacción financiera.

**Columnas:**

| Nombre       | Tipo                     | Descripción                                        |
|--------------|--------------------------|---------------------------------------------------|
| id           | uuid                     | ID único de la transacción (PK)                   |
| user_id      | uuid                     | ID del usuario propietario (FK a auth.users)      |
| date         | timestamp with time zone | Fecha y hora de la transacción                    |
| description  | text                     | Descripción de la transacción                     |
| category_id  | uuid                     | ID de la categoría (FK a categories, nullable)    |
| amount       | numeric                  | Monto de la transacción (siempre positivo)        |
| currency     | character varying        | Moneda: 'ARS', 'USD', 'EUR', 'CRYPTO'             |
| wallet_id    | uuid                     | ID de la billetera (FK a wallets, nullable)       |
| type         | text                     | Tipo: 'income' o 'expense'                        |
| is_recurring | boolean                  | Indica si es una transacción recurrente           |
| recurring_id | uuid                     | ID de la plantilla recurrente (FK, nullable)      |
| crypto_type  | character varying        | Tipo de cripto: 'BTC', 'ETH', 'USDC', 'USDT'      |
| created_at   | timestamp with time zone | Fecha de creación del registro                    |
| updated_at   | timestamp with time zone | Fecha de última actualización                     |

**Índices:** Ver sección [Índices](#índices)

**Triggers:**
- `trg_transactions_updated_at` - Actualiza `updated_at` automáticamente
- `trigger_validate_transaction_wallet_currency` - Valida que la moneda de la transacción coincida con la de la billetera

**RLS:** Habilitado (usuarios solo ven sus propias transacciones)

---

### 5. recurring_transactions

Plantillas para transacciones recurrentes automáticas.

**Columnas:**

| Nombre      | Tipo                     | Descripción                                   |
|-------------|--------------------------|-----------------------------------------------|
| id          | uuid                     | ID único de la plantilla (PK)                 |
| user_id     | uuid                     | ID del usuario propietario (FK a auth.users)  |
| description | text                     | Descripción de la transacción recurrente      |
| category_id | uuid                     | ID de la categoría (FK a categories)          |
| amount      | numeric                  | Monto de la transacción                       |
| currency    | character varying        | Moneda                                        |
| wallet_id   | uuid                     | ID de la billetera (FK a wallets)             |
| type        | text                     | Tipo: 'income' o 'expense'                    |
| cadence     | text                     | Frecuencia: 'daily', 'weekly', 'monthly', etc.|
| next_date   | date                     | Próxima fecha de ejecución                    |
| active      | boolean                  | Si la recurrencia está activa                 |
| created_at  | timestamp with time zone | Fecha de creación                             |
| updated_at  | timestamp with time zone | Fecha de última actualización                 |

**Índices:**
- `idx_recurring_user_id` - Filtrado por usuario

**Triggers:**
- `trg_recurring_updated_at` - Actualiza `updated_at` automáticamente

**RLS:** Habilitado

---

## Vistas

Las vistas proporcionan datos pre-agregados para mejorar el rendimiento de consultas analíticas.

### 1. transactions_with_details

Transacciones enriquecidas con información de categorías y billeteras.

**Propósito:** Eliminar la necesidad de JOINs en la aplicación para mostrar listados de transacciones.

**Columnas:**
- Todas las columnas de `transactions`
- `category_name` - Nombre de la categoría
- `category_color` - Color de la categoría
- `category_icon` - Ícono de la categoría
- `wallet_name` - Nombre de la billetera
- `wallet_provider` - Proveedor de la billetera

**Query base:**
```sql
SELECT t.*,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon,
       w.name as wallet_name,
       w.provider as wallet_provider
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN wallets w ON t.wallet_id = w.id
```

**Uso:** Listados de transacciones con toda la información necesaria en una sola query.

---

### 2. transaction_monthly_summary

Resumen mensual de transacciones agrupadas por usuario, tipo y moneda.

**Propósito:** Análisis de tendencias mensuales y generación de gráficos.

**Columnas:**
- `user_id` - ID del usuario
- `month` - Mes en formato YYYY-MM-DD
- `type` - Tipo de transacción
- `currency` - Moneda
- `transaction_count` - Cantidad de transacciones
- `total_amount` - Suma total
- `avg_amount` - Promedio
- `min_amount` - Mínimo
- `max_amount` - Máximo

**Agregación:** Usa `DATE_TRUNC('month', date)` para agrupar por mes.

**Uso:** Gráficos de líneas de tendencias mensuales, reportes financieros mensuales.

---

### 3. transaction_category_summary

Resumen de transacciones por categoría con metadata.

**Propósito:** Distribución de gastos/ingresos por categoría para gráficos tipo pie.

**Columnas:**
- `user_id` - ID del usuario
- `category_id` - ID de la categoría
- `category_name` - Nombre de la categoría
- `category_type` - Tipo (income/expense)
- `category_color` - Color
- `category_icon` - Ícono
- `currency` - Moneda
- `transaction_count` - Cantidad de transacciones
- `total_amount` - Suma total

**Uso:** Gráficos de distribución por categoría (pie charts).

---

### 4. transaction_daily_summary

Resumen diario de los últimos 90 días.

**Propósito:** Dashboards con actividad reciente y gráficos de tendencias cortas.

**Columnas:**
- `user_id` - ID del usuario
- `date` - Fecha (sin hora)
- `type` - Tipo de transacción
- `currency` - Moneda
- `transaction_count` - Cantidad de transacciones
- `total_amount` - Suma total

**Filtro:** Solo incluye transacciones de los últimos 90 días.

**Uso:** Gráficos de barras diarios, actividad reciente.

---

### 5. wallet_current_balance

Saldo actual calculado de cada billetera.

**Propósito:** Mostrar el balance real de cada billetera considerando todas las transacciones.

**Columnas:**
- Todas las columnas de `wallets`
- `current_balance` - Saldo calculado (balance inicial + ingresos - gastos)
- `total_income` - Total de ingresos en la billetera
- `total_expenses` - Total de gastos en la billetera
- `transaction_count` - Cantidad de transacciones

**Cálculo:**
```sql
balance +
COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
```

**Uso:** Vista de billeteras con saldos actualizados en tiempo real.

---

### 6. user_financial_summary

Resumen financiero general por usuario y moneda.

**Propósito:** KPIs principales para dashboards.

**Columnas:**
- `user_id` - ID del usuario
- `currency` - Moneda
- `total_income` - Total de ingresos
- `total_expenses` - Total de gastos
- `net_balance` - Balance neto (ingresos - gastos)
- `transaction_count` - Total de transacciones
- `wallet_count` - Cantidad de billeteras en esa moneda
- `category_count` - Cantidad de categorías usadas

**Uso:** Tarjetas de estadísticas principales en el dashboard.

---

## Índices

Los índices mejoran significativamente el rendimiento de consultas frecuentes.

### Índices en `transactions`

| Nombre                            | Columnas                          | Tipo      | Propósito                                        |
|-----------------------------------|-----------------------------------|-----------|--------------------------------------------------|
| `idx_transactions_user_date`      | (user_id, date DESC)              | Composite | Listado principal de transacciones por usuario   |
| `idx_transactions_user_type`      | (user_id, type)                   | Composite | Filtrado por tipo (income/expense)               |
| `idx_transactions_user_category`  | (user_id, category_id)            | Partial   | Filtrado por categoría (excluye NULL)            |
| `idx_transactions_user_wallet`    | (user_id, wallet_id)              | Partial   | Filtrado por billetera (excluye NULL)            |
| `idx_transactions_date`           | (date)                            | Single    | Queries globales por fecha                       |
| `idx_transactions_recurring`      | (recurring_id)                    | Partial   | Relaciones con recurrentes (excluye NULL)        |
| `idx_transactions_user_date_type` | (user_id, date DESC, type)        | Composite | Combinación común de filtros                     |
| `idx_transactions_user_currency`  | (user_id, currency)               | Composite | Filtrado por moneda                              |

**Beneficios:**
- **Partial Indexes**: Reducen el tamaño del índice al excluir valores NULL (ahorro ~30-40%)
- **DESC en date**: Permite queries eficientes en orden cronológico inverso
- **Composite Indexes**: Cubren múltiples condiciones WHERE sin escaneo completo

### Índices en otras tablas

| Tabla        | Índice                          | Columnas              | Propósito                    |
|--------------|----------------------------------|-----------------------|------------------------------|
| `categories` | `idx_categories_user_id`         | (user_id)             | Filtrado por usuario         |
| `wallets`    | `idx_wallets_user_id`            | (user_id)             | Filtrado por usuario         |
| `wallets`    | `idx_wallets_user_currency`      | (user_id, currency)   | Queries por usuario y moneda |
| `recurring`  | `idx_recurring_user_id`          | (user_id)             | Filtrado por usuario         |

---

## Funciones y Triggers

### 1. set_updated_at()

**Tipo:** Función PL/pgSQL
**Propósito:** Actualizar automáticamente la columna `updated_at` cuando se modifica una fila.

**Código:**
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Aplicado en:**
- `categories` (trigger: `trg_categories_updated_at`)
- `wallets` (trigger: `trg_wallets_updated_at`)
- `transactions` (trigger: `trg_transactions_updated_at`)
- `recurring_transactions` (trigger: `trg_recurring_updated_at`)

**Ejecución:** BEFORE UPDATE en cada fila

---

### 2. validate_transaction_wallet_currency()

**Tipo:** Función PL/pgSQL
**Propósito:** Validar que la moneda de una transacción coincida con la moneda de la billetera asignada.

**Lógica:**
1. Si `wallet_id` es NULL, no hace nada (transacciones sin billetera son válidas)
2. Si `wallet_id` está presente, verifica que exista una billetera con:
   - Mismo `user_id`
   - Mismo `currency`
   - ID coincidente
3. Si no encuentra coincidencia, lanza excepción

**Código:**
```sql
CREATE OR REPLACE FUNCTION validate_transaction_wallet_currency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM wallets
            WHERE id = NEW.wallet_id
            AND user_id = NEW.user_id
            AND currency = NEW.currency
        ) THEN
            RAISE EXCEPTION 'Transaction currency must match wallet currency';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Aplicado en:**
- `transactions` (trigger: `trigger_validate_transaction_wallet_currency`)

**Ejecución:** BEFORE INSERT OR UPDATE en cada fila

**Beneficio:** Previene inconsistencias de datos a nivel de base de datos.

---

## Constraints

### Check Constraints en `wallets`

| Constraint                  | Columna   | Validación                                     |
|-----------------------------|-----------|------------------------------------------------|
| `check_currency_valid`      | currency  | Debe ser 'ARS', 'USD', 'EUR' o 'CRYPTO'        |
| `check_provider_not_empty`  | provider  | No puede ser string vacío o solo espacios      |
| `check_name_not_empty`      | name      | No puede ser string vacío o solo espacios      |

**Ejemplos:**
```sql
-- Válido
INSERT INTO wallets (name, provider, currency)
VALUES ('Mi Cuenta', 'Brubank', 'ARS');

-- Inválido - currency no válida
INSERT INTO wallets (name, provider, currency)
VALUES ('Mi Cuenta', 'Brubank', 'GBP'); -- ERROR

-- Inválido - provider vacío
INSERT INTO wallets (name, provider, currency)
VALUES ('Mi Cuenta', '', 'ARS'); -- ERROR
```

---

## Políticas RLS

Row Level Security (RLS) asegura que cada usuario solo pueda acceder a sus propios datos.

### Políticas en `wallets`

| Policy Name                          | Operation | Condición                              |
|--------------------------------------|-----------|----------------------------------------|
| Users can view their own wallets     | SELECT    | `auth.uid() = user_id`                 |
| Users can create their own wallets   | INSERT    | `auth.uid() = user_id`                 |
| Users can update their own wallets   | UPDATE    | `auth.uid() = user_id` (USING y CHECK)|
| Users can delete their own wallets   | DELETE    | `auth.uid() = user_id`                 |

**Ejemplo de uso:**
```sql
-- Usuario autenticado con uid = '123e4567-e89b-12d3-a456-426614174000'

-- Solo verá sus propias billeteras
SELECT * FROM wallets;
-- Automáticamente filtra: WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'

-- No puede crear billeteras para otros usuarios
INSERT INTO wallets (user_id, name, provider, currency)
VALUES ('otro-user-id', 'Hack', 'Test', 'ARS'); -- ERROR: RLS violation
```

### Políticas en otras tablas

Políticas similares están aplicadas en:
- `categories`
- `transactions`
- `recurring_transactions`

**Nota:** Las vistas respetan automáticamente las RLS policies de las tablas subyacentes.

---

## Migraciones SQL

Las migraciones están numeradas secuencialmente y deben ejecutarse en orden.

### 001_create_transactions_tables.sql

**Descripción:** Crea las tablas base del sistema.

**Objetos creados:**
- Extension: `pgcrypto`
- Tablas: `categories`, `wallets`, `recurring_transactions`, `transactions`
- Función: `set_updated_at()`
- Triggers: 4 triggers para `updated_at`
- Índices básicos: 4 índices iniciales

**Tamaño:** ~200 líneas
**Estado:** ✅ Ejecutado

---

### 002_crypto_and_defaults.sql

**Descripción:** Agrega soporte para criptomonedas y categorías por defecto.

**Objetos creados:**
- Columna: `crypto_type` en `transactions`
- Tabla: `default_categories`
- Seed data: 6 categorías predefinidas

**Dependencias:** Requiere 001

**Tamaño:** ~80 líneas
**Estado:** ✅ Ejecutado

---

### 003_add_transaction_indexes.sql

**Descripción:** Optimización de performance mediante índices especializados.

**Objetos creados:**
- 8 índices en `transactions`
- Comentarios de documentación

**Dependencias:** Requiere 001

**Impacto:** Mejora consultas en ~80-95%

**Tamaño:** ~60 líneas
**Estado:** ✅ Ejecutado

---

### 004_create_statistics_views.sql

**Descripción:** Vistas para analytics y reportes.

**Objetos creados:**
- Vista: `transaction_monthly_summary`
- Vista: `transaction_category_summary`
- Vista: `transaction_daily_summary`
- Vista: `wallet_current_balance`
- Vista: `user_financial_summary`
- Vista: `transactions_with_details`

**Dependencias:** Requiere 001, 002

**Beneficio:** Queries pre-calculadas para dashboards

**Tamaño:** ~250 líneas
**Estado:** ✅ Ejecutado

---

### 005_update_wallets_constraints.sql

**Descripción:** Constraints de integridad y seguridad RLS.

**Objetos creados:**
- 3 check constraints en `wallets`
- 2 índices en `wallets`
- Función: `validate_transaction_wallet_currency()`
- Trigger: `trigger_validate_transaction_wallet_currency`
- 4 RLS policies en `wallets`

**Dependencias:** Requiere 001

**Beneficio:** Integridad de datos y seguridad multi-tenant

**Tamaño:** ~90 líneas
**Estado:** ✅ Ejecutado (corregido truncamiento en línea 53)

---

### 006_create_scheduled_transactions.sql

**Descripción:** Crea tabla para transacciones programadas (gastos/ingresos fijos) con ejecución automática.

**Objetos creados:**
- Tabla: `scheduled_transactions`
- Función: `calculate_next_execution_date()`
- Función: `validate_scheduled_wallet_currency()`
- Trigger: `trigger_validate_scheduled_wallet_currency`
- Trigger: `trg_scheduled_transactions_updated_at`
- 6 índices especializados
- 3 vistas analíticas
- 4 RLS policies

**Campos principales:**
- Planificación: start_date, end_date, frequency, next_execution_date, last_execution_date
- Estado: is_active (para pausar sin eliminar)
- Transacción: description, type, amount, currency, category_id, wallet_id
- Seguimiento: created_at, updated_at

**Vistas creadas:**
1. `scheduled_transactions_with_details` - Con datos de categoría y billetera
2. `pending_scheduled_transactions` - Transacciones listas para ejecutar hoy
3. `active_scheduled_by_type` - Agrupación por tipo para análisis

**Frecuencias soportadas:**
- daily, weekly, bi-weekly, monthly, quarterly, bi-annual, yearly

**Dependencias:** Requiere 001, 002 (para validaciones de categoría y wallet)

**Beneficio:** Permite automatizar transacciones recurrentes que se reflejan en historial

**Tamaño:** ~435 líneas
**Estado:** ✅ Ejecutado

---

## Diagrama de Dependencias (Actualizado)

```
┌─────────────────────────────────────────────────┐
│  001_create_transactions_tables.sql             │
│  • categories                                   │
│  • wallets                                      │
│  • recurring_transactions                       │
│  • transactions                                 │
│  • set_updated_at() function                    │
└────────────┬────────────────────────────────────┘
             │
             ├──────────────────┬──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
┌─────────────────────┐  ┌──────────────┐  ┌──────────────┐
│ 002_crypto_and      │  │ 003_add      │  │ 005_update   │
│ _defaults.sql       │  │ _transaction │  │ _wallets     │
│ • crypto_type col   │  │ _indexes.sql │  │ _constraints │
│ • default_categories│  │ • 8 indexes  │  │ • constraints│
└──────────┬──────────┘  └──────┬───────┘  └──────┬───────┘
           │                    │                  │
           └────────┬───────────┴──────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ 004_create          │
         │ _statistics_views   │
         │ • 6 analytical views│
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────────────────┐
         │ 007_create_scheduled_            │
         │ transactions.sql                 │
         │ • scheduled_transactions table   │
         │ • 3 analytical views             │
         │ • 6 indexes                      │
         │ • 4 RLS policies                 │
         └─────────────────────────────────┘
```

**Orden de ejecución recomendado:**
1. `001` (base obligatoria)
2. `002` (extensión de features)
3. `003` (performance - opcional pero recomendado)
4. `004` (analytics - opcional)
5. `005` (seguridad - opcional pero recomendado en producción)
6. `007` (transacciones programadas - opcional pero recomendado para automatización)
2. `002` (extensión de features)
3. `003` (performance - opcional pero recomendado)
4. `004` (analytics - opcional)
5. `005` (seguridad - opcional pero recomendado en producción)

---

## Guía de Deployment

### Pre-requisitos

- Supabase proyecto creado
- PostgreSQL 13+
- Extensión `pgcrypto` disponible
- Autenticación Supabase configurada

### Pasos de Deployment

#### 1. Ejecutar migraciones en orden

```bash
# Desde Supabase Dashboard > SQL Editor
# O usando Supabase CLI

# Migración 001 - Base
supabase migration new create_transactions_tables
# Copiar contenido de 001_create_transactions_tables.sql
supabase db push

# Migración 002 - Crypto support
supabase migration new crypto_and_defaults
# Copiar contenido de 002_crypto_and_defaults.sql
supabase db push

# Migración 003 - Indexes
supabase migration new add_transaction_indexes
# Copiar contenido de 003_add_transaction_indexes.sql
supabase db push

# Migración 004 - Views
supabase migration new create_statistics_views
# Copiar contenido de 004_create_statistics_views.sql
supabase db push

# Migración 005 - Constraints & RLS
supabase migration new update_wallets_constraints
# Copiar contenido de 005_update_wallets_constraints.sql
supabase db push
```

#### 2. Verificar deployment

```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar vistas
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar índices
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

#### 3. Seed initial data (opcional)

```sql
-- Las categorías por defecto se crean automáticamente en 002
-- Verificar:
SELECT * FROM default_categories;
```

### Rollback

Cada migración usa `IF NOT EXISTS` o `DROP IF EXISTS`, lo que las hace idempotentes. Para rollback:

```sql
-- Rollback 005
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can create their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;
DROP TRIGGER IF EXISTS trigger_validate_transaction_wallet_currency ON transactions;
DROP FUNCTION IF EXISTS validate_transaction_wallet_currency();
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_currency_valid;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_provider_not_empty;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_name_not_empty;

-- Rollback 004
DROP VIEW IF EXISTS transactions_with_details;
DROP VIEW IF EXISTS user_financial_summary;
DROP VIEW IF EXISTS wallet_current_balance;
DROP VIEW IF EXISTS transaction_daily_summary;
DROP VIEW IF EXISTS transaction_category_summary;
DROP VIEW IF EXISTS transaction_monthly_summary;

-- Rollback 003
DROP INDEX IF EXISTS idx_transactions_user_currency;
DROP INDEX IF EXISTS idx_transactions_user_date_type;
DROP INDEX IF EXISTS idx_transactions_recurring;
DROP INDEX IF EXISTS idx_transactions_date;
DROP INDEX IF EXISTS idx_transactions_user_wallet;
DROP INDEX IF EXISTS idx_transactions_user_category;
DROP INDEX IF EXISTS idx_transactions_user_type;
DROP INDEX IF EXISTS idx_transactions_user_date;

-- Rollback 002
DROP TABLE IF EXISTS default_categories;
ALTER TABLE transactions DROP COLUMN IF EXISTS crypto_type;

-- Rollback 001 (CUIDADO - elimina todas las tablas)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP FUNCTION IF EXISTS set_updated_at();
```

### Monitoring

```sql
-- Tamaño de tablas
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Uso de índices
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Queries lentas
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Notas de Optimización

### Performance Tips

1. **Índices compuestos**: Siempre filtrar primero por `user_id` para aprovechar índices composite
2. **Vistas materializadas**: Para dashboards ejecutivos con millones de registros, considerar materializar las vistas
3. **Particionamiento**: Si hay >10M transacciones, particionar `transactions` por fecha
4. **Vacuum**: Ejecutar `VACUUM ANALYZE` periódicamente

### Seguridad

1. **RLS siempre activo**: Nunca deshabilitar RLS en producción
2. **Service role**: Usar solo en backend, nunca exponer en frontend
3. **Anon key**: Suficiente para operaciones públicas con RLS
4. **Auditoría**: Considerar agregar tabla de audit logs para transacciones críticas

### Escalabilidad

| Transacciones | Estrategia                              |
|---------------|-----------------------------------------|
| < 100K        | Schema actual es suficiente             |
| 100K - 1M     | Considerar vistas materializadas        |
| 1M - 10M      | Particionamiento por año                |
| > 10M         | Particionamiento por mes + archiving    |

---

**Última actualización:** 2025-11-15
**Versión del schema:** 1.0
**Autor:** Sistema Equals - Financial Management App
