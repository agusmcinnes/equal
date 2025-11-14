# Equal - Gestor de Finanzas Personales

**Equal** es una aplicación de gestión financiera personal desarrollada con Angular, diseñada para facilitar el control y seguimiento de las finanzas diarias.

## Características

- Gestión de ingresos y gastos
- Categorización de transacciones
- Programación de operaciones futuras
- Registro de ahorros e inversiones
- Establecimiento de objetivos financieros
- Integración con Dólar API
- Gráficos y visualizaciones financieras
- Autenticación segura con Supabase
- Diseño responsivo (Desktop y Mobile)

## Tecnologías

- **Frontend**: Angular 20.3.8
- **Lenguaje**: TypeScript
- **Backend/DB**: Supabase
- **Autenticación**: Supabase Auth
- **UI Components**: Angular Material
- **Estilos**: CSS puro
- **Fuente**: Poppins

## Colores de Marca

- Primary: `#463397`
- Secondary: `#9850eb`
- Accent: `#6d38c7`
- Dark: `#2c116a`

## Estructura del Proyecto

```
src/app/
├── components/     # Componentes reutilizables
├── core/          # Servicios core (Supabase config)
├── guards/        # Guards de autenticación
├── layouts/       # Layouts (Sidebar, Mobile Nav, Main Layout)
├── models/        # Interfaces y tipos TypeScript
├── pages/         # Páginas de la aplicación
├── services/      # Servicios de negocio
└── shared/        # Recursos compartidos
```

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.8.

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia las credenciales de tu proyecto
3. Actualiza el archivo `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'TU_SUPABASE_URL',
    anonKey: 'TU_SUPABASE_ANON_KEY'
  }
};
```

4. Actualiza también `src/environments/environment.prod.ts` con las credenciales de producción

## Development server

Para iniciar el servidor de desarrollo, ejecuta:

```bash
ng serve
```

Abre tu navegador en `http://localhost:4200/`. La aplicación se recargará automáticamente cuando modifiques los archivos fuente.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
