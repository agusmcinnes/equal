# Deployment Guide: Supabase Edge Function para Transacciones Programadas

## 📋 Resumen

Esta guía te ayudará a deployar la Edge Function de Supabase que ejecuta automáticamente las transacciones programadas cada 5 minutos.

## 🎯 Funcionalidad

La Edge Function `execute-scheduled-transactions`:
- ✅ Se ejecuta automáticamente cada 5 minutos (configurable)
- ✅ Consulta transacciones programadas pendientes (vista `pending_scheduled_transactions`)
- ✅ Crea transacciones reales en la tabla `transactions`
- ✅ Actualiza `last_execution_date` y calcula `next_execution_date`
- ✅ Desactiva transacciones que llegaron a su `end_date`
- ✅ Funciona 24/7 independientemente de si la app está abierta
- ✅ Logs detallados de cada ejecución

## 📦 Prerequisitos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Cuenta de Supabase** con acceso al proyecto

3. **Database configurada** con las migraciones de scheduled_transactions ejecutadas

## 🚀 Pasos de Deployment

### 1. Login a Supabase

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

### 2. Link al proyecto

Obtén tu `project-ref` desde el dashboard de Supabase (Settings > General > Reference ID)

```bash
supabase link --project-ref tu-project-ref-aqui
```

Ejemplo:
```bash
supabase link --project-ref xyzabcdefghijklm
```

### 3. Deploy de la Edge Function

Desde la raíz del proyecto:

```bash
supabase functions deploy execute-scheduled-transactions
```

Verás una salida similar a:
```
Deploying function execute-scheduled-transactions
Function URL: https://xyzabcdefghijklm.supabase.co/functions/v1/execute-scheduled-transactions
```

### 4. Configurar el Cron Schedule

**Opción A: Usando Supabase Dashboard (Recomendado)**

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Database > Cron Jobs** (si está disponible en tu plan)
3. Click en **Create a new cron job**
4. Configura:
   - **Name**: `execute-scheduled-transactions`
   - **Schedule**: `*/5 * * * *` (cada 5 minutos)
   - **SQL Command**:
     ```sql
     SELECT
       net.http_post(
         url:='https://tu-project-ref.supabase.co/functions/v1/execute-scheduled-transactions',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
       );
     ```

**Opción B: Usando pg_cron directamente**

Si tu plan de Supabase incluye `pg_cron`:

```sql
-- Ejecutar en SQL Editor de Supabase
SELECT cron.schedule(
  'execute-scheduled-transactions',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://tu-project-ref.supabase.co/functions/v1/execute-scheduled-transactions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer tu-service-role-key"}'::jsonb
    );
  $$
);
```

**Opción C: Usando servicios externos (Alternativa)**

Si no tienes acceso a pg_cron, puedes usar:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions

Configura para hacer POST request cada 5 minutos a:
```
https://tu-project-ref.supabase.co/functions/v1/execute-scheduled-transactions
```

Con header:
```
Authorization: Bearer tu-anon-key
```

### 5. Verificar que funciona

**Testing manual:**

```bash
curl -X POST \
  https://tu-project-ref.supabase.co/functions/v1/execute-scheduled-transactions \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json"
```

Respuesta esperada:
```json
{
  "timestamp": "2025-01-16T12:34:56.789Z",
  "totalChecked": 3,
  "executed": 3,
  "warnings": 0,
  "failures": 0,
  "results": [
    {
      "transactionId": "uuid-here",
      "scheduledId": "uuid-here",
      "success": true,
      "description": "Pago de renta"
    }
  ],
  "message": "Processed 3 scheduled transactions. 3 successful, 0 warnings, 0 failed."
}
```

## 📊 Monitoring y Logs

### Ver logs en tiempo real

```bash
supabase functions logs execute-scheduled-transactions --follow
```

### Ver logs en Dashboard

1. Ve a **Edge Functions** en tu proyecto de Supabase
2. Click en `execute-scheduled-transactions`
3. Tab **Logs**

Logs incluyen:
- Timestamp de cada ejecución
- Número de transacciones pendientes encontradas
- Resultado de cada transacción (éxito/error)
- Mensajes de error detallados si algo falla

## 🔧 Configuración del Cron

El cron schedule usa la sintaxis estándar:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Ejemplos comunes:**

- `*/5 * * * *` - Cada 5 minutos (configuración actual)
- `*/1 * * * *` - Cada 1 minuto
- `*/15 * * * *` - Cada 15 minutos
- `0 * * * *` - Cada hora en punto
- `0 0 * * *` - Cada día a medianoche

Para cambiar la frecuencia, edita el cron schedule en el dashboard o ejecuta nuevamente el comando SQL con el nuevo valor.

## 🔒 Seguridad

- ✅ La función usa `SUPABASE_SERVICE_ROLE_KEY` para bypassear RLS (necesario para crear transacciones de todos los usuarios)
- ✅ Solo se ejecutan transacciones que cumplan:
  - `is_active = true`
  - `next_execution_date <= NOW()`
  - `end_date IS NULL OR end_date >= NOW()`
- ✅ Cada transacción se crea con el `user_id` correcto de la scheduled transaction
- ✅ RLS policies en la tabla `transactions` siguen aplicando para las queries de usuarios

## 🐛 Troubleshooting

### La función no se ejecuta automáticamente

**Verificar:**
1. ¿El cron job está configurado correctamente?
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'execute-scheduled-transactions';
   ```

2. ¿La URL de la función es correcta?
   - Verifica en Dashboard > Edge Functions

3. ¿El service role key es válido?
   - Verifica en Dashboard > Settings > API

### La función se ejecuta pero no crea transacciones

**Verificar logs:**
```bash
supabase functions logs execute-scheduled-transactions --limit 50
```

**Causas comunes:**
- `next_execution_date` aún no llegó
- Transacción desactivada (`is_active = false`)
- Error de validación (moneda de wallet no coincide)
- Categoría o wallet eliminados

**Query manual para debugging:**
```sql
-- Ver transacciones que deberían ejecutarse
SELECT * FROM pending_scheduled_transactions;
```

### Error: "Missing Supabase environment variables"

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se inyectan automáticamente al deployar.

Si ves este error:
1. Re-deploya la función: `supabase functions deploy execute-scheduled-transactions`
2. Verifica que estás usando Supabase CLI actualizado: `npm update -g supabase`

### Transacciones se ejecutan múltiples veces

**Causa:** El cron se ejecuta más frecuentemente de lo esperado o múltiples crons configurados.

**Solución:**
```sql
-- Ver todos los cron jobs activos
SELECT * FROM cron.job;

-- Eliminar duplicados
SELECT cron.unschedule('nombre-del-job-duplicado');
```

## 📈 Mejoras Futuras Opcionales

### 1. Notificaciones por email

Modificar `index.ts` para enviar email cuando se crea una transacción:

```typescript
// Después de crear la transacción
await supabase.functions.invoke('send-email', {
  body: {
    to: userEmail,
    subject: 'Nueva transacción programada ejecutada',
    html: `Se ejecutó: ${scheduled.description} - $${scheduled.amount}`
  }
});
```

### 2. Retry logic

Agregar reintentos si falla la creación de una transacción:

```typescript
let retries = 3;
while (retries > 0) {
  try {
    // create transaction
    break;
  } catch (error) {
    retries--;
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 3. Webhook notifications

Llamar a un webhook externo cuando se ejecuta una transacción:

```typescript
await fetch('https://tu-webhook.com/notifications', {
  method: 'POST',
  body: JSON.stringify({ transaction: newTransaction })
});
```

## 📚 Referencias

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime Docs](https://deno.land/manual)
- [Cron Syntax Guide](https://crontab.guru/)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)

## ✅ Checklist de Deployment

- [ ] Supabase CLI instalado y actualizado
- [ ] Login a Supabase realizado
- [ ] Proyecto linkeado correctamente
- [ ] Edge Function deployada
- [ ] Cron schedule configurado
- [ ] Testing manual realizado
- [ ] Logs verificados
- [ ] Transacción de prueba creada y ejecutada correctamente
- [ ] Monitoring configurado para producción

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs de la función
2. Verifica la configuración del cron
3. Prueba manualmente con curl
4. Revisa las issues del repositorio
5. Consulta la documentación de Supabase

---

**Última actualización:** 2025-01-16
**Versión:** 1.0
**Autor:** Sistema Equals - Financial Management App
