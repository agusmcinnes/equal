# Sección de Perfil - Documentación

## Descripción General

La sección de perfil permite a los usuarios ver y editar su información personal, cargar una foto de perfil (avatar), y ver información sobre su cuenta.

## Características

### 1. Visualización de Información
- **Nombre Completo**: Nombre del usuario
- **Email**: Correo electrónico registrado
- **Avatar**: Foto de perfil con icono predeterminado si no hay imagen
- **Biografía**: Descripción personal (opcional)
- **Fecha de Creación**: Cuándo se creó la cuenta

### 2. Edición de Perfil
- Los usuarios pueden hacer clic en "Editar Perfil" para entrar en modo edición
- Pueden editar:
  - Nombre Completo
  - Biografía
- Los cambios se guardan en tiempo real en Supabase
- Se muestra un mensaje de éxito al guardar

### 3. Carga de Avatar
- Botón de cámara sobre la foto de perfil
- Acepta archivos de imagen (PNG, JPG, GIF, etc.)
- Máximo 5MB por imagen
- Las imágenes se almacenan en el bucket `avatars` de Supabase Storage
- URLs públicas para mostrar en toda la app

### 4. Sección de Lema
- Motora inspiradora al pie de la página sobre economía personal
- Diseño con gradiente y iconografía

## Estructura de Componentes

```
src/app/pages/profile/
├── profile.ts          # Componente principal
├── profile.html        # Template
└── profile.css         # Estilos

src/app/services/
└── profile.service.ts  # Servicio de lógica

src/app/models/
└── user.model.ts       # Interface actualizada con 'bio'

src/assets/i18n/
├── es.json            # Traducciones español
├── en.json            # Traducciones inglés
└── pt.json            # Traducciones portugués
```

## Base de Datos

### Tabla: `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos:
- `id`: ID único del perfil
- `user_id`: Referencia al usuario en auth.users (uno a uno)
- `full_name`: Nombre completo del usuario
- `avatar_url`: URL pública del avatar en Supabase Storage
- `bio`: Biografía/descripción personal
- `created_at`: Fecha de creación automática
- `updated_at`: Fecha de última actualización (auto-actualizado por trigger)

#### Índices:
- Índice en `user_id` para búsquedas rápidas

#### RLS (Row Level Security):
- Los usuarios solo pueden ver su propio perfil
- Los usuarios solo pueden actualizar su propio perfil
- Los usuarios solo pueden insertar su propio perfil

#### Triggers:
- `update_user_profiles_timestamp`: Actualiza automáticamente `updated_at` en cada modificación
- `create_user_profile`: Crea automáticamente un perfil cuando se registra un usuario

### Bucket Storage: `avatars`

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

#### Políticas:
- Cualquiera puede ver los avatars (bucket público)
- Los usuarios solo pueden subir sus propios avatars
- Los usuarios solo pueden actualizar sus propios avatars

## Flujo de Datos

### Cargar Perfil
1. Componente se inicializa
2. Se obtiene el usuario actual desde AuthService
3. ProfileService llama a Supabase con `user_id`
4. Se llenan los campos del formulario de edición

### Actualizar Perfil
1. Usuario hace clic en "Editar Perfil"
2. Modo edición activado
3. Usuario modifica los campos
4. Al hacer clic en "Guardar":
   - ProfileService llama a `updateProfile()`
   - Se ejecuta trigger para actualizar `updated_at`
   - Se muestra mensaje de éxito
5. Modo edición se desactiva

### Cargar Avatar
1. Usuario hace clic en el botón de cámara
2. Se abre el selector de archivos
3. Validación:
   - Tipo de archivo (debe ser imagen)
   - Tamaño máximo (5MB)
4. Si es válido:
   - ProfileService llama a `uploadAvatar()`
   - Se sube a `storage.avatars` con nombre: `{userId}-{timestamp}`
   - Se obtiene la URL pública
   - Se actualiza `avatar_url` en user_profiles
   - Se muestra el avatar actualizado

## Seguridad

### RLS (Row Level Security)
Todas las operaciones están protegidas por políticas RLS:
- Solo se pueden leer/actualizar datos del usuario autenticado
- Imposible acceder a perfiles de otros usuarios

### Validaciones en Cliente
- Validación de tipo de archivo
- Validación de tamaño de archivo
- Validación de campos requeridos

### Validaciones en Servidor
- RLS de Supabase previene acceso no autorizado
- Triggers aseguran integridad de datos

## Traducciones

### Claves i18n Disponibles
```
profile.title
profile.edit
profile.save
profile.cancel
profile.fullName
profile.email
profile.bio
profile.memberSince
profile.successUpdate
profile.errorUpdate
profile.changeAvatar
profile.avatarUpdated
profile.errorAvatar
profile.imageTooLarge
profile.invalidImage
profile.notSpecified
```

Disponibles en: español (es), inglés (en), portugués (pt)

## Rutas

- **Pública**: No (requiere autenticación)
- **Ruta**: `/profile`
- **Componente**: `Profile`
- **Layout**: `MainLayout` (con sidebar y barra de navegación móvil)

## Styling

### Tema Oscuro
- Variables CSS del sistema (--bg-primary, --bg-secondary, --text-primary, --color-primary)
- Colores coherentes con el resto de la app
- Gradientes para elementos destacados

### Responsive
- Desktop: Layout completo con avatar grande
- Mobile: Layout adaptado, avatar más pequeño, botones en full-width en modo edición

### Componentes
- Botones con efectos hover y transiciones
- Inputs con focus visible
- Mensajes de éxito/error animados
- Loading spinner durante carga inicial
- Animaciones suaves (transform, opacity)

## Scripts SQL Necesarios

Ejecutar en Supabase:

1. `017_create_user_profiles.sql` - Crear tabla y políticas RLS
2. `018_create_avatars_storage.sql` - Crear bucket de storage y políticas

## Próximos Pasos Recomendados

1. Agregar validación de email único
2. Agregar cambio de contraseña en perfil
3. Agregar historial de cambios de avatar
4. Agregar estadísticas de usuario (años usando la app, total de transacciones, etc.)
5. Agregar preferencias de privacidad
6. Exportar datos del usuario (GDPR compliance)
