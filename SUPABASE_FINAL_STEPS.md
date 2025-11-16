# 🎯 INSTRUCCIONES FINALES PARA SUPABASE

## ✅ El SQL está listo. Aquí está cómo ejecutarlo.

---

## 🚀 PASO A PASO

### 1️⃣ Abre Supabase Dashboard
```
https://supabase.com/dashboard
```

### 2️⃣ Selecciona tu proyecto
- Haz clic en tu proyecto "equal"

### 3️⃣ Ve a SQL Editor
```
Menú lateral izquierdo
└─ "SQL Editor"
```

### 4️⃣ Copia el script SQL
- Abre: `supabase/sql/007_create_scheduled_transactions.sql`
- Selecciona TODO (Ctrl+A)
- Copia (Ctrl+C)

### 5️⃣ Pega en Supabase
- En Supabase > SQL Editor
- Click en área blanca
- Pega (Ctrl+V)

### 6️⃣ Ejecuta
```
Click en botón "RUN" (parte superior derecha)
```

### 7️⃣ Verifica
```
Debería decir: "Success" sin errores
```

---

## ✅ VERIFICACIÓN POST-EJECUCIÓN

### Verifica la tabla
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'scheduled_transactions' 
AND table_schema = 'public';
```

**Resultado esperado:**
```
scheduled_transactions
```

### Verifica las vistas
```sql
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name LIKE 'scheduled%';
```

**Resultado esperado:**
```
scheduled_transactions_with_details
pending_scheduled_transactions
active_scheduled_by_type
```

### Verifica los índices
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'scheduled_transactions';
```

**Resultado esperado:**
```
idx_scheduled_user_id
idx_scheduled_user_type
idx_scheduled_user_currency
idx_scheduled_category
idx_scheduled_wallet
idx_scheduled_active_next_date
```

### Verifica RLS
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'scheduled_transactions';
```

**Resultado esperado:**
```
Users can view their own scheduled transactions
Users can create their own scheduled transactions
Users can update their own scheduled transactions
Users can delete their own scheduled transactions
```

---

## 🧪 PRUEBA RÁPIDA EN SUPABASE

### Crear una transacción programada de prueba
```sql
-- Obtén tu user_id primero (si tienes usuario autenticado)
-- O usa uno de ejemplo

INSERT INTO scheduled_transactions 
(user_id, description, amount, currency, type, start_date, frequency, next_execution_date, is_active)
VALUES 
(
  'YOUR_USER_ID_HERE',  -- Reemplaza con tu user_id
  'Test - Sueldo',
  50000,
  'ARS',
  'income',
  NOW(),
  'monthly',
  NOW(),
  true
);
```

### Verificar que se creó
```sql
SELECT id, description, amount, frequency, next_execution_date 
FROM scheduled_transactions 
WHERE description LIKE 'Test%';
```

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### ❌ "ERROR 42P01: relation "categories" does not exist"
**Causa:** Las migraciones 001 y 002 no se ejecutaron  
**Solución:** Ejecuta primero `001_create_transactions_tables.sql` y `002_crypto_and_defaults.sql`

### ❌ "ERROR 42P08: column "user_id" of relation "auth.users" does not exist"
**Causa:** Problema con Supabase auth  
**Solución:** Verifica que Supabase Auth esté habilitado en el proyecto

### ❌ "ERROR 42601: syntax error at or near"
**Causa:** Ya está solucionado en esta versión  
**Solución:** Usa esta versión final del script

### ✅ "Success" pero sin mensajes
- Esto es normal, significa que se ejecutó correctamente

---

## 📋 DESPUÉS DE EJECUTAR SQL

### 1. Inicia la app
```bash
cd proyecto
npm start
```

### 2. Abre navegador
```
http://localhost:4200/scheduled
```

### 3. Inicia sesión
- Usa tus credenciales

### 4. Crea una transacción programada
- Click "Nuevo Ingreso"
- Completa el formulario
- Click "Crear"

### 5. Verifica ejecución automática
- Espera ~1 minuto
- Ve a "Transacciones"
- Debería aparecer una nueva transacción

---

## 📊 COMANDOS SQL ÚTILES

### Ver todas las transacciones programadas
```sql
SELECT * FROM scheduled_transactions_with_details LIMIT 10;
```

### Ver pendientes de ejecutar
```sql
SELECT * FROM pending_scheduled_transactions;
```

### Ver estadísticas por tipo
```sql
SELECT * FROM active_scheduled_by_type;
```

### Eliminar todas las de prueba
```sql
DELETE FROM scheduled_transactions 
WHERE description LIKE 'Test%';
```

### Ver últimas ejecutadas
```sql
SELECT * FROM transactions 
WHERE is_recurring = true 
ORDER BY date DESC LIMIT 5;
```

---

## 🔒 CONFIGURACIÓN DE PERMISOS

### El RLS está pre-configurado para:
- ✅ Usuarios solo ven sus propias transacciones
- ✅ Usuarios solo pueden crear las suyas
- ✅ Usuarios solo pueden editar las suyas
- ✅ Usuarios solo pueden eliminar las suyas

### No necesitas hacer nada más de configuración

---

## 🚨 IMPORTANTE

### Antes de ejecutar en producción:
- [ ] Verifica que todas las migraciones anteriores (001-005) estén ejecutadas
- [ ] Verifica que el RLS esté habilitado
- [ ] Verifica que los índices se crearon
- [ ] Prueba en desarrollo primero

---

## ✨ SI TODO VA BIEN

1. ✅ Supabase SQL Editor mostró "Success"
2. ✅ Verifica SELECT devolvieron resultados
3. ✅ App inicia sin errores
4. ✅ Puedes crear transacciones programadas
5. ✅ Se ejecutan automáticamente cada minuto
6. ✅ Aparecen en el historial de transacciones

---

## 📞 TROUBLESHOOTING FINAL

### ❌ "No puedo acceder a /scheduled"
→ Verifica que estés autenticado

### ❌ "No puedo crear transacciones"
→ Abre consola (F12) y busca errores en Network

### ❌ "La aplicación no compila"
→ Ejecuta `npm install` nuevamente

### ❌ "Los datos no se reflejan"
→ Recarga la página (Ctrl+R o Cmd+R)

---

## 🎉 LISTO

Si ejecutaste el SQL sin errores, ¡está todo listo para usar!

**Ahora puedes:**
- Crear gastos/ingresos fijos
- Editarlos
- Pausarlos/Reanudarlos
- Eliminarlos
- Y disfrutar de la ejecución automática ✨

---

**Suerte! 🚀**
