-- =====================================================
-- SCRIPTS PARA CREAR TABLAS - TRUST SEGUROS
-- Ejecutar en orden en tu base de datos PostgreSQL
-- =====================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    celular VARCHAR(20),
    identificacion VARCHAR(50) UNIQUE,
    departamento VARCHAR(50),
    municipio VARCHAR(50),
    direccion TEXT,
    rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('cliente', 'agente', 'admin')),
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id SERIAL PRIMARY KEY,
    numero_cotizacion VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_seguro VARCHAR(20) NOT NULL CHECK (tipo_seguro IN ('auto', 'sepelio', 'accidentes')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'en_revision')),
    
    -- Datos del vehículo (JSON para flexibilidad)
    datos_vehiculo JSONB,
    
    -- Datos del cliente (JSON)
    datos_cliente JSONB NOT NULL,
    
    -- Datos de cobertura (JSON)
    datos_cobertura JSONB,
    
    -- Forma de pago
    forma_pago VARCHAR(20) CHECK (forma_pago IN ('debito', 'deposito')),
    
    -- Cálculos financieros
    prima_calculada DECIMAL(12,2),
    iva DECIMAL(10,2),
    derecho_emision DECIMAL(8,2) DEFAULT 5.18,
    total_pagar DECIMAL(12,2),
    
    -- Observaciones
    observaciones TEXT,
    
    -- Agente que procesó
    agente_id INTEGER REFERENCES usuarios(id),
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de seguros/pólizas
CREATE TABLE IF NOT EXISTS seguros (
    id SERIAL PRIMARY KEY,
    numero_poliza VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    cotizacion_id INTEGER REFERENCES cotizaciones(id),
    tipo_seguro VARCHAR(20) NOT NULL CHECK (tipo_seguro IN ('auto', 'sepelio', 'accidentes')),
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada', 'suspendida')),
    
    -- Fechas de vigencia
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    fecha_proximo_pago DATE,
    
    -- Montos
    prima_anual DECIMAL(12,2) NOT NULL,
    suma_asegurada DECIMAL(15,2),
    deducible DECIMAL(10,2),
    
    -- Datos del bien asegurado (JSON para flexibilidad)
    datos_asegurado JSONB NOT NULL,
    
    -- Coberturas (JSON)
    coberturas JSONB NOT NULL,
    
    -- Beneficiarios (JSON)
    beneficiarios JSONB,
    
    -- Forma de pago
    forma_pago JSONB,
    
    -- Historial de pagos (JSON)
    historial_pagos JSONB DEFAULT '[]'::jsonb,
    
    -- Agente responsable
    agente_id INTEGER REFERENCES usuarios(id),
    
    -- Documentos (JSON con URLs)
    documentos JSONB DEFAULT '[]'::jsonb,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de siniestros
CREATE TABLE IF NOT EXISTS siniestros (
    id SERIAL PRIMARY KEY,
    numero_siniestro VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    seguro_id INTEGER REFERENCES seguros(id) ON DELETE CASCADE,
    tipo_seguro VARCHAR(20) NOT NULL,
    estado VARCHAR(30) DEFAULT 'reportado' CHECK (estado IN ('reportado', 'en_proceso', 'en_investigacion', 'aprobado', 'rechazado', 'cerrado')),
    
    -- Datos del incidente
    fecha_incidente DATE NOT NULL,
    hora_incidente TIME,
    lugar_incidente TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    
    -- Datos de contacto
    telefono_contacto VARCHAR(20) NOT NULL,
    email_contacto VARCHAR(100),
    direccion_contacto TEXT,
    
    -- Personas involucradas (JSON)
    personas_involucradas JSONB DEFAULT '[]'::jsonb,
    
    -- Daños reportados (JSON)
    danos_reportados JSONB DEFAULT '[]'::jsonb,
    
    -- Montos
    monto_reclamado DECIMAL(15,2),
    monto_aprobado DECIMAL(15,2),
    deducible_aplicado DECIMAL(10,2),
    
    -- Evaluación
    ajustador_id INTEGER REFERENCES usuarios(id),
    fecha_evaluacion DATE,
    dictamen TEXT,
    observaciones_ajustador TEXT,
    
    -- Documentos adjuntos (JSON con URLs)
    documentos JSONB DEFAULT '[]'::jsonb,
    
    -- Seguimiento (JSON)
    seguimiento JSONB DEFAULT '[]'::jsonb,
    
    -- Pagos realizados (JSON)
    pagos JSONB DEFAULT '[]'::jsonb,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de recomendados
CREATE TABLE IF NOT EXISTS recomendados (
    id SERIAL PRIMARY KEY,
    usuario_referente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    tipo_interes VARCHAR(20) CHECK (tipo_interes IN ('auto', 'sepelio', 'accidentes', 'todos')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'contactado', 'convertido', 'no_interesado')),
    comentarios TEXT,
    
    -- Seguimiento de contactos (JSON)
    historial_contactos JSONB DEFAULT '[]'::jsonb,
    
    -- Conversión
    cliente_convertido_id INTEGER REFERENCES usuarios(id),
    fecha_conversion DATE,
    
    -- Bonificación
    bonificacion_monto DECIMAL(8,2),
    bonificacion_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (bonificacion_estado IN ('pendiente', 'pagada')),
    fecha_pago_bonificacion DATE,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    categoria VARCHAR(50) DEFAULT 'general',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos/documentos
CREATE TABLE IF NOT EXISTS archivos (
    id SERIAL PRIMARY KEY,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    tipo_mime VARCHAR(100),
    tamaño INTEGER,
    
    -- Relación con otras tablas
    tabla_referencia VARCHAR(50), -- 'cotizaciones', 'siniestros', etc.
    id_referencia INTEGER,
    
    -- Usuario que subió el archivo
    usuario_id INTEGER REFERENCES usuarios(id),
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs/auditoría
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tabla_afectada VARCHAR(50) NOT NULL,
    id_registro INTEGER NOT NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
