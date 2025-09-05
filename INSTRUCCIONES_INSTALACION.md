# 📋 INSTRUCCIONES DE INSTALACIÓN - TRUST SEGUROS API

## 🗄️ **PASO 1: Configurar Base de Datos**

### 1.1 Ejecutar Scripts SQL
Ejecuta los siguientes archivos SQL **EN ORDEN** en tu base de datos PostgreSQL:

\`\`\`bash
# 1. Crear tablas
psql -U tu_usuario -d tu_base_de_datos -f database/01_create_tables.sql

# 2. Crear índices
psql -U tu_usuario -d tu_base_de_datos -f database/02_create_indexes.sql

# 3. Crear funciones
psql -U tu_usuario -d tu_base_de_datos -f database/03_create_functions.sql

# 4. Crear triggers
psql -U tu_usuario -d tu_base_de_datos -f database/04_create_triggers.sql

# 5. Insertar datos iniciales
psql -U tu_usuario -d tu_base_de_datos -f database/05_insert_initial_data.sql
\`\`\`

### 1.2 Verificar Instalación
\`\`\`sql
-- Verificar que las tablas se crearon correctamente
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usuarios', 'cotizaciones', 'seguros', 'siniestros', 'recomendados');

-- Verificar datos iniciales
SELECT * FROM configuraciones;
SELECT email, rol FROM usuarios;
\`\`\`

## ⚙️ **PASO 2: Configurar API**

### 2.1 Configurar Variables de Entorno
1. Copia el archivo `.env.example` a `.env`
2. Edita `.env` con tus datos reales:

\`\`\`env
# Cambiar estos valores por los tuyos
DB_HOST=tu_servidor_postgresql
DB_PORT=5432
DB_NAME=tu_base_de_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña

# Cambiar en producción
JWT_SECRET=un_secret_muy_seguro_y_largo
\`\`\`

### 2.2 Instalar Dependencias
\`\`\`bash
npm install
\`\`\`

### 2.3 Probar Conexión
\`\`\`bash
npm run dev
\`\`\`

Deberías ver:
\`\`\`
✅ Conexión a PostgreSQL exitosa
📅 Hora del servidor: ...
🗄️ Versión PostgreSQL: ...
🚀 Servidor corriendo en puerto 3001
\`\`\`

## 🧪 **PASO 3: Probar API**

### 3.1 Health Check
\`\`\`bash
curl http://localhost:3001/api/health
\`\`\`

### 3.2 Login de Prueba
\`\`\`bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trustseguros.com","password":"admin123"}'
\`\`\`

## 🔧 **PASO 4: Integración con Frontend**

Una vez que el API esté funcionando, podrás conectar tu aplicativo web cambiando la URL base de las peticiones a:

\`\`\`javascript
const API_BASE_URL = 'http://localhost:3001/api'
\`\`\`

## 📊 **Tablas Creadas**

- ✅ `usuarios` - Gestión de usuarios
- ✅ `cotizaciones` - Cotizaciones de seguros
- ✅ `seguros` - Pólizas activas
- ✅ `siniestros` - Reportes de siniestros
- ✅ `recomendados` - Sistema de referidos
- ✅ `configuraciones` - Configuraciones del sistema
- ✅ `archivos` - Gestión de documentos
- ✅ `logs_auditoria` - Auditoría del sistema

## 🔑 **Usuarios por Defecto**

- **Admin**: `admin@trustseguros.com` / `admin123`
- **Demo**: `demo@trustseguros.com` / `demo123`

## ❗ **Notas Importantes**

1. **Seguridad**: Cambia el `JWT_SECRET` en producción
2. **Passwords**: Los passwords de ejemplo están hasheados con bcrypt
3. **Tablas Existentes**: El sistema respeta tus tablas `valor_nuevo` y `margen_depreciacion`
4. **Backup**: Haz backup de tu base de datos antes de ejecutar los scripts

## 🆘 **Solución de Problemas**

### Error de Conexión
- Verifica que PostgreSQL esté corriendo
- Confirma usuario, contraseña y nombre de base de datos
- Revisa que el usuario tenga permisos de creación

### Error de Permisos
\`\`\`sql
-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE tu_base_de_datos TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tu_usuario;
\`\`\`

### Puerto Ocupado
\`\`\`bash
# Cambiar puerto en .env
PORT=3002
