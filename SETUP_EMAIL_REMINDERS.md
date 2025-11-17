# Setup Guide: Email Reminders para Transacciones Programadas

## 📋 Resumen

Este sistema envía recordatorios diarios por email a las 9:00 AM con un resumen de todas las transacciones programadas que se ejecutarán ese día.

## 🎯 Funcionalidad

- ✅ **Envío automático diario** a las 9:00 AM
- ✅ **Un email por usuario** con todas sus transacciones del día
- ✅ **Información completa**: descripción, monto, hora, categoría, billetera
- ✅ **Diseño responsive** y profesional
- ✅ **Funciona 24/7** sin necesidad de tener la app abierta

## 📦 Prerequisitos

1. **Edge Function deployada** (ya hecho ✅)
2. **API Key de Resend**: `re_PX6s1mZ1_8WTGUCRT31Tmm4T31G3C9F8E`
3. **Acceso al Dashboard de Supabase**

---

## 🚀 Pasos de Deployment

### 1. Configurar Secret en Supabase

La Edge Function necesita la API Key de Resend como variable de entorno secreta.

**Pasos:**

1. Ve a tu **Dashboard de Supabase**: https://app.supabase.com/project/xfkisbxfomosmkonvyip
2. Click en **Settings** (⚙️) en el menú lateral izquierdo
3. Click en **Edge Functions**
4. Busca la sección **"Secrets"** o **"Environment Variables"**
5. Click en **"Add new secret"**
6. Configura:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_PX6s1mZ1_8WTGUCRT31Tmm4T31G3C9F8E`
7. Click **Save** o **Add**

**Nota:** Los secrets se inyectan automáticamente en todas las Edge Functions.

---

### 2. Deploy de la Edge Function

Desde la raíz del proyecto, ejecuta:

```bash
npx supabase functions deploy send-daily-reminders
```

Deberías ver:
```
Deployed Functions on project xfkisbxfomosmkonvyip: send-daily-reminders
Function URL: https://xfkisbxfomosmkonvyip.supabase.co/functions/v1/send-daily-reminders
```

---

### 3. Crear función SQL helper

Ejecuta esto en el **SQL Editor** de Supabase:

```sql
-- Crear función que llama a la Edge Function de recordatorios
CREATE OR REPLACE FUNCTION public.send_daily_reminders_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://xfkisbxfomosmkonvyip.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhma2lzYnhmb21vc21rb252eWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODcwMDEsImV4cCI6MjA3ODY2MzAwMX0.KZ2UzKAEhpw9xBcOG3DEkKy8ARl1xBxY2xCRrJ-9410'
    )
  );
END;
$$;
```

Verificar que se creó:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'send_daily_reminders_cron';
```

---

### 4. Configurar Cron Job (9:00 AM diario)

Ejecuta esto en el **SQL Editor**:

```sql
-- Eliminar cron si existe (por si acaso)
SELECT cron.unschedule('send-daily-reminders');

-- Crear cron job que ejecuta todos los días a las 9:00 AM
SELECT cron.schedule(
  'send-daily-reminders',
  '0 9 * * *',
  $$SELECT public.send_daily_reminders_cron()$$
);
```

**Sintaxis del cron:** `0 9 * * *`
- `0` = Minuto 0
- `9` = Hora 9 (9:00 AM)
- `* * *` = Todos los días, todos los meses, todos los días de la semana

**Verificar que se creó:**
```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'send-daily-reminders';
```

Deberías ver:

| jobid | jobname | schedule | command | active |
|-------|---------|----------|---------|--------|
| X | send-daily-reminders | 0 9 * * * | SELECT public.send_daily_reminders_cron() | true |

---

## 🧪 Testing

### Probar manualmente la función

**Opción A: Llamar vía SQL**

```sql
SELECT public.send_daily_reminders_cron();
```

**Opción B: Llamar vía HTTP (curl)**

```bash
curl -X POST \
  https://xfkisbxfomosmkonvyip.supabase.co/functions/v1/send-daily-reminders \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhma2lzYnhmb21vc21rb252eWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODcwMDEsImV4cCI6MjA3ODY2MzAwMX0.KZ2UzKAEhpw9xBcOG3DEkKy8ARl1xBxY2xCRrJ-9410"
```

**Respuesta esperada:**

Si hay transacciones programadas para hoy:
```json
{
  "timestamp": "2025-11-16T12:00:00.000Z",
  "date": "sábado, 16 de noviembre de 2025",
  "totalUsers": 2,
  "emailsSent": 2,
  "emailsFailed": 0,
  "totalTransactions": 5,
  "message": "Sent 2 emails to users with scheduled transactions for today. 0 failed."
}
```

Si NO hay transacciones para hoy:
```json
{
  "timestamp": "2025-11-16T12:00:00.000Z",
  "message": "No scheduled transactions for today. No emails sent.",
  "totalUsers": 0,
  "emailsSent": 0
}
```

---

### Crear transacción de prueba para hoy

Para probar el sistema completo:

1. Ve a tu app → **Operaciones Futuras**
2. Crea una transacción programada con:
   - **Fecha de inicio**: HOY a cualquier hora (ej: hoy a las 15:00)
   - **Frecuencia**: Daily
   - Descripción, monto, categoría, etc.
3. Ejecuta manualmente la función de reminders (ver arriba)
4. Verifica tu email

---

## 📊 Monitoring y Logs

### Ver logs de la Edge Function

**Dashboard:**
1. Ve a **Edge Functions** → `send-daily-reminders` → **Logs**
2. Verás cada ejecución con timestamp y resultado

**CLI:**
```bash
npx supabase functions logs send-daily-reminders --follow
```

### Ver historial de ejecuciones del cron

```sql
SELECT
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

**Columnas importantes:**
- `status`: `'succeeded'` o `'failed'`
- `return_message`: Mensaje de error si falló
- `start_time`: Cuándo se ejecutó

### Query para ver usuarios con transacciones hoy

```sql
-- Ver qué usuarios recibirían el email HOY
SELECT
  user_id,
  COUNT(*) as transaction_count,
  STRING_AGG(description, ', ') as descriptions
FROM scheduled_transactions_with_details
WHERE is_active = true
AND DATE(next_execution_date) = CURRENT_DATE
GROUP BY user_id;
```

---

## 🔧 Configuración del Cron (cambiar horario)

Si quieres cambiar el horario de envío:

```sql
-- Eliminar el cron actual
SELECT cron.unschedule('send-daily-reminders');

-- Crear con nuevo horario
-- Ejemplos:
-- '0 8 * * *'  = 8:00 AM
-- '0 12 * * *' = 12:00 PM (mediodía)
-- '0 20 * * *' = 8:00 PM
-- '30 9 * * *' = 9:30 AM

SELECT cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',  -- Cambiar aquí
  $$SELECT public.send_daily_reminders_cron()$$
);
```

---

## 📧 Configuración de Resend

### Dominio de prueba (actual)

Actualmente estás usando `onboarding@resend.dev` que es el dominio de testing de Resend.

**Características:**
- ✅ Funciona inmediatamente sin configuración
- ✅ 100 emails/día gratis
- ⚠️ Los emails pueden llegar a spam
- ⚠️ Solo para desarrollo/testing

### Usar tu propio dominio (producción)

Para producción, debes verificar tu propio dominio:

1. **Agregar dominio en Resend:**
   - Ve a https://resend.com/domains
   - Click en "Add Domain"
   - Ingresa tu dominio (ej: `equals.com`)

2. **Configurar DNS:**
   - Resend te dará registros DNS para agregar
   - Agrega esos registros en tu proveedor de dominio
   - Espera verificación (5-30 minutos)

3. **Actualizar el código:**
   - En `index.ts`, línea ~49, cambia:
   ```typescript
   from: 'Equals <noreply@tu-dominio.com>',  // En lugar de onboarding@resend.dev
   ```

4. **Re-deploy:**
   ```bash
   npx supabase functions deploy send-daily-reminders
   ```

---

## 🐛 Troubleshooting

### Error: "Missing RESEND_API_KEY"

**Causa:** El secret no está configurado correctamente.

**Solución:**
1. Verifica en Dashboard > Settings > Edge Functions > Secrets
2. Debe existir `RESEND_API_KEY` con el valor correcto
3. Re-deploya la función: `npx supabase functions deploy send-daily-reminders`

### Emails no llegan

**Verificar:**

1. **Logs de la función:**
   ```bash
   npx supabase functions logs send-daily-reminders
   ```
   Busca errores de Resend

2. **Carpeta de spam:**
   - Revisa spam/junk en tu email
   - Con `onboarding@resend.dev` es común que lleguen a spam

3. **Email del usuario existe:**
   ```sql
   SELECT id, email FROM auth.users WHERE id = 'user-id-aqui';
   ```

4. **Quota de Resend:**
   - Ve a https://resend.com/emails
   - Verifica que no hayas excedido 100 emails/día

### El cron no se ejecuta

**Verificar:**

1. **Cron está activo:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-daily-reminders';
   ```
   `active` debe ser `true`

2. **Horario correcto:**
   - El cron usa UTC, no hora local
   - Si configuraste `0 9 * * *`, se ejecuta a las 9:00 AM UTC
   - Para Argentina (UTC-3), serían las 6:00 AM hora local

3. **Función SQL existe:**
   ```sql
   SELECT public.send_daily_reminders_cron();
   ```
   Debe ejecutarse sin errores

### Emails se duplican

**Causa:** Múltiples cron jobs configurados.

**Solución:**
```sql
-- Ver todos los cron jobs
SELECT * FROM cron.job;

-- Eliminar duplicados
SELECT cron.unschedule('nombre-del-cron-duplicado');
```

---

## 🎨 Personalizar el Email

### Cambiar colores del tema

Edita `email-template.ts`, líneas con gradientes:

```typescript
// Cambiar gradiente del header
background: linear-gradient(135deg, #TU-COLOR-1, #TU-COLOR-2);

// Cambiar color de botón CTA
background: linear-gradient(135deg, #TU-COLOR-1, #TU-COLOR-2);
```

### Cambiar URL de la app

Edita `email-template.ts`, línea ~145:

```typescript
<a href="https://tu-app-url.com" ...>
```

### Agregar logo

Edita `email-template.ts`, dentro del header:

```typescript
<img src="https://tu-dominio.com/logo.png" alt="Equals" style="height: 40px; margin-bottom: 16px;" />
```

---

## 📈 Mejoras Futuras Opcionales

### 1. Preferencias de usuario

Permitir a cada usuario:
- Activar/desactivar recordatorios
- Elegir hora preferida
- Frecuencia (diario, semanal)

**Implementación:**
- Tabla `user_preferences` con `enable_reminders`, `reminder_time`
- Modificar la función para respetar preferencias

### 2. Resumen semanal

Enviar email los lunes con todas las transacciones de la semana.

**Implementación:**
- Nueva función: `send-weekly-summary`
- Cron: `0 9 * * 1` (lunes a las 9 AM)

### 3. Notificaciones push

Además de email, enviar notificación push en la app.

**Implementación:**
- Integrar Firebase Cloud Messaging
- Guardar device tokens en DB
- Modificar función para enviar ambos

---

## ✅ Checklist de Deployment

- [ ] Secret `RESEND_API_KEY` configurado en Supabase
- [ ] Edge Function deployada
- [ ] Función SQL `send_daily_reminders_cron()` creada
- [ ] Cron job configurado (`0 9 * * *`)
- [ ] Cron job verificado como activo
- [ ] Prueba manual realizada
- [ ] Email de prueba recibido
- [ ] Logs verificados sin errores
- [ ] Dominio verificado en Resend (opcional, para producción)

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs de la Edge Function
2. Verifica el historial del cron job
3. Prueba manualmente la función
4. Revisa la configuración del secret
5. Verifica quota de Resend

---

**Última actualización:** 2025-11-16
**Versión:** 1.0
**Servicio de email:** Resend
**Horario:** 9:00 AM diario (UTC)
