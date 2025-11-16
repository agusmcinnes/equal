1. Autenticación y Gestión de Usuarios
RF1 El sistema deberá permitir al usuario registrarse mediante correo electrónico y contraseña.
RF2 El sistema deberá permitir al usuario iniciar sesión con credenciales válidas.
RF3 El sistema deberá permitir al usuario cerrar sesión de forma segura.
RF4 El sistema deberá validar los campos obligatorios y mostrar al usuario mensajes de error claros.
RF5 El sistema deberá permitir al usuario recuperar su contraseña mediante correo electrónico.


2. Gestión de Ingresos y Gastos
RF6 El sistema deberá permitir al usuario registrar operaciones
RF7 El sistema debe permitir que el usuario seleccione para cada operación: fecha, descripción, categoría, monto, moneda, billetera (MP, Ualá, Efectivo, DF, CF) y tipo (ingreso/gasto). 
RF8 El sistema deberá permitir al usuario editar o eliminar operaciones existentes.
RF9 El sistema deberá permitir al usuario filtrar operaciones por tipo, categoría o fecha.
RF10 El sistema deberá mostrar al usuario el historial de operaciones recientes.
RF11 El sistema deberá permitir al usuario marcar una operación como “gasto fijo” (para replicarla automáticamente en futuros períodos).
RF12 El sistema deberá registrar automáticamente los movimientos fijos en la sección “Futuro”, visibles para el usuario.
RF13 El sistema deberá permitir al usuario consultar los totales de ingresos y gastos por semana o mes.

3. Gestión de Categorías
RF14 El sistema deberá permitir al usuario crear, modificar y eliminar categorías personalizadas.
RF15 Cada categoría definida por el usuario deberá incluir un nombre, un tipo (ingreso o gasto), un color identificativo y un icono o emoji.
RF16 El sistema deberá permitir al usuario asignar una categoría a cada operación.
RF17 El sistema deberá mostrar al usuario un gráfico de distribución de ingresos y gastos por categoría.


4. Programación de Operaciones Futuras
RF18 El sistema deberá permitir al usuario programar ingresos o gastos futuros, indicando fecha, monto y categoría.

RF20 El sistema deberá permitir al usuario editar o eliminar operaciones futuras antes de su ejecución.
RF21 El sistema deberá mostrar al usuario un listado de próximos movimientos.

6. Patrimonio, Ahorros e Inversiones
RF22 El sistema deberá mostrar al usuario su patrimonio total en tiempo real (en pesos y dólares).
RF23 El sistema deberá permitir al usuario registrar ahorros e inversiones como parte de su patrimonio.

7. Objetivos Financieros
RF25 El sistema deberá permitir al usuario crear, modificar y eliminar objetivos financieros.
RF26 Cada objetivo definido por el usuario deberá incluir un nombre, monto meta, monto acumulado, fecha estimada y descripción opcional.
RF27 El sistema deberá permitir al usuario destinar fondos desde sus ingresos o saldo disponible hacia un objetivo específico.
RF28 El sistema deberá calcular y mostrar al usuario el porcentaje de avance hacia cada objetivo.
RF29 El sistema deberá mostrar al usuario gráficos de progreso para visualizar el cumplimiento de los objetivos.
RF30 Cuando un objetivo sea alcanzado, el sistema deberá registrarlo como “logrado” y mostrarlo al usuario en una sección de logros.

8. Cotización del Dólar (API Externa)
RF31 El sistema deberá permitir al usuario visualizar la cotización actual del dólar en la sección principal (Home).
RF32 El sistema deberá obtener automáticamente la información desde la API de DolarAPI.
RF33 El sistema deberá contar con un mecanismo de caché local para evitar repeticiones excesivas y garantizar una experiencia fluida para el usuario.
RF34 El sistema deberá actualizar la cotización de forma automática con una frecuencia configurable por el administrador o establecida por defecto.

9. Informes e Indicadores
RF35 El sistema deberá generar para el usuario gráficos de balance general (ingresos vs egresos).
RF36 El sistema deberá generar para el usuario gráficos comparativos mensuales de ingresos y gastos.
RF37 El sistema deberá permitir al usuario seleccionar rangos de fechas para generar informes personalizados.
RF38 Los gráficos deberán actualizarse dinámicamente ante cualquier cambio realizado por el usuario en sus datos
