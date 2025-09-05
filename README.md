# Trust Seguros API

API REST para el sistema de Trust Correduría de Seguros desarrollada con Express.js y PostgreSQL.

## 🚀 Características

- **Autenticación JWT** - Sistema seguro de autenticación
- **Base de datos PostgreSQL** - Almacenamiento robusto y escalable
- **Validación de datos** - Validación completa con Joi
- **Seguridad** - Helmet, CORS, Rate limiting
- **Arquitectura modular** - Código organizado y mantenible

## 📋 Requisitos

- Node.js 16+
- PostgreSQL 12+
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
\`\`\`bash
git clone <repository-url>
cd trust-seguros-api
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**
\`\`\`bash
cp .env.example .env
# Editar .env con tus configuraciones
\`\`\`

4. **Crear base de datos**
\`\`\`bash
# Conectar a PostgreSQL y crear la base de datos
createdb trust_seguros
\`\`\`

5. **Ejecutar migraciones**
\`\`\`bash
npm run migrate
\`\`\`

6. **Sembrar datos iniciales**
\`\`\`bash
npm run seed
\`\`\`

## 🚀 Uso

### Desarrollo
\`\`\`bash
npm run dev
\`\`\`

### Producción
\`\`\`bash
npm start
\`\`\`

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/verify` - Verificar token

### Cotizaciones
- `GET /api/cotizaciones` - Obtener cotizaciones
- `POST /api/cotizaciones/auto` - Crear cotización de auto
- `GET /api/cotizaciones/:id` - Obtener cotización específica
- `PATCH /api/cotizaciones/:id/estado` - Actualizar estado

### Seguros
- `GET /api/seguros` - Obtener seguros del usuario
- `GET /api/seguros/:id` - Obtener seguro específico
- `POST /api/seguros/crear-desde-cotizacion/:id` - Crear póliza

### Siniestros
- `GET /api/siniestros` - Obtener siniestros
- `POST /api/siniestros` - Reportar siniestro
- `GET /api/siniestros/:id` - Obtener siniestro específico

### Recomendados
- `GET /api/recomendados` - Obtener recomendados
- `POST /api/recomendados` - Crear recomendación
- `PATCH /api/recomendados/:id/estado` - Actualizar estado

### Usuarios
- `GET /api/usuarios/perfil` - Obtener perfil
- `PUT /api/usuarios/perfil` - Actualizar perfil
- `GET /api/usuarios/dashboard-stats` - Estadísticas del dashboard

## 🔒 Autenticación

La API utiliza JWT para autenticación. Incluir el token en el header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## 🗄️ Base de Datos

### Tablas principales:
- `usuarios` - Información de usuarios
- `cotizaciones` - Cotizaciones de seguros
- `seguros` - Pólizas activas
- `siniestros` - Reportes de siniestros
- `recomendados` - Sistema de referidos
- `configuraciones` - Configuraciones del sistema

## 🔧 Configuración

Variables de entorno importantes:

\`\`\`env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_NAME=trust_seguros
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=tu_jwt_secret_muy_seguro
\`\`\`

## 👥 Usuarios por defecto

Después de ejecutar `npm run seed`:

- **Admin**: admin@trustseguros.com / admin123
- **Demo**: juan@email.com / demo123

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
