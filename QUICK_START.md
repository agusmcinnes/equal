# ⚡ INICIO RÁPIDO - Transacciones Programadas

## 🚀 En 5 Minutos

### 1. Ejecuta SQL (1 min)
```
1. Supabase > SQL Editor
2. Pega: supabase/sql/007_create_scheduled_transactions.sql
3. Ejecuta ✓
```

### 2. Inicia App (1 min)
```bash
npm start
```

### 3. Abre Sección (1 min)
```
http://localhost:4200/scheduled
```

### 4. Crea tu primer Ingreso Fijo (2 min)
```
Click "Nuevo Ingreso"
└─ Descripción: "Sueldo"
└─ Monto: 50000
└─ Moneda: ARS
└─ Frecuencia: Mensualmente
└─ Fecha inicio: Hoy
└─ Click "Crear" ✓
```

### 5. ¡Listo! 🎉
```
La transacción aparecerá en el grid
Se ejecutará automáticamente cada mes
Verás cambios en balance y gráficos
```

---

## 📁 Archivos Clave

| Archivo | Qué es | Líneas |
|---------|--------|--------|
| `supabase/sql/007_create_scheduled_transactions.sql` | Script SQL | 435 |
| `src/app/pages/scheduled/` | Página principal | 701 |
| `src/app/components/scheduled-card/` | Tarjeta transacción | 414 |
| `src/app/components/scheduled-modal/` | Formulario modal | 426 |
| `src/app/services/scheduled-transactions.service.ts` | CRUD service | 230 |
| `src/app/services/scheduled-transaction-executor.service.ts` | Ejecutor automático | 186 |

---

## 🎯 Funcionalidades

✅ Crear ingreso/gasto fijo  
✅ Editar transacción  
✅ Pausar/Reanudar  
✅ Eliminar  
✅ Ejecución automática  
✅ Reflejo en historial  
✅ Actualización de balance  
✅ Responsive mobile/tablet  

---

## ⚙️ Configuración

**Frecuencias disponibles:**
- Diaria
- Semanal
- Cada 2 semanas
- Mensual
- Trimestral
- Semestral
- Anual

**Monedas soportadas:**
- ARS
- USD
- EUR
- CRYPTO

---

## 🐛 Problemas Comunes

### ❌ "Table does not exist"
→ Ejecuta el SQL en Supabase

### ❌ No se ejecutan automáticamente
→ Recarga la página (Ctrl+R)

### ❌ Modal no abre
→ Abre consola (F12) y busca errores

### ❌ Error validación billetera
→ Usa moneda de la billetera

---

## 📖 Documentación Completa

- 📘 `GUIA_INSTALACION_SCHEDULED.md` - Pasos detallados
- 📗 `RESUMEN_SCHEDULED_TRANSACTIONS.md` - Resumen técnico
- 📙 `src/app/pages/scheduled/README.md` - Documentación de módulo
- 📕 `BDD.md` - Base de datos completa

---

## 🎮 Prueba Rápida

```typescript
// En DevTools Console:
// Ver transacciones
this.scheduledService.getUserScheduledTransactions().subscribe(
  t => console.log('Programadas:', t)
);

// Crear transacción
this.scheduledService.createScheduledTransaction({
  description: 'Test',
  type: 'expense',
  amount: 1000,
  currency: 'ARS',
  start_date: new Date().toISOString(),
  frequency: 'monthly',
  next_execution_date: new Date().toISOString(),
  is_active: true
}).subscribe();
```

---

## ✅ Checklist

- [ ] Ejecuté SQL en Supabase
- [ ] npm start funciona
- [ ] Puedo acceder a `/scheduled`
- [ ] Puedo crear transacción
- [ ] Puedo editar transacción
- [ ] Puedo pausar/reanudar
- [ ] Puedo eliminar
- [ ] Se ve bien en mobile
- [ ] Los datos se reflejan en historial

---

## 📊 Arquitectura Simple

```
App
 ├─ ScheduledComponent (página)
 │   ├─ ScheduledCardComponent (tarjeta)
 │   └─ ScheduledModalComponent (formulario)
 │
 ├─ ScheduledTransactionsService (CRUD)
 │   └─ Supabase API
 │
 └─ ScheduledTransactionExecutorService (automático)
     └─ Verifica cada minuto
         └─ Crea transacción en historial
```

---

## 🎨 Estilos

- 🟢 Ingreso: Verde (#22c55e)
- 🔴 Gasto: Rojo (#ef4444)
- 🟣 Primario: Índigo (#6366f1)
- 📝 Font: Poppins

---

## 🚀 Próximos Pasos Opcionales

1. Agregar notificaciones
2. Crear widget en dashboard
3. Exportar como PDF
4. Agregar calendario
5. Proyecciones de flujo

---

**¡Todo listo! Disfruta tu nueva sección.** 🎉
