-- Crear base de datos
CREATE DATABASE trust_seguros;

-- Usar la base de datos
\c trust_seguros;

-- Tabla de usuarios
CREATE TABLE usuarios (
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
    rol VARCHAR(20) DEFAULT 'cliente',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cotizaciones
CREATE TABLE cotizaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo_seguro VARCHAR(20) NOT NULL, -- 'auto', 'sepelio', 'accidentes'
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aprobada', 'rechazada', 'en_revision'
    datos_vehiculo JSONB, -- Para seguros de auto
    datos_cliente JSONB NOT NULL,
    datos_cobertura JSONB,
    forma_pago VARCHAR(20), -- 'debito', 'deposito'
    prima_calculada DECIMAL(10,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de seguros/pólizas
CREATE TABLE seguros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    cotizacion_id INTEGER REFERENCES cotizaciones(id),
    numero_poliza VARCHAR(50) UNIQUE NOT NULL,
    tipo_seguro VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activa', -- 'activa', 'vencida', 'cancelada'
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    prima_anual DECIMAL(10,2) NOT NULL,
    suma_asegurada DECIMAL(12,2),
    deducible DECIMAL(10,2),
    datos_asegurado JSONB NOT NULL,
    coberturas JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de siniestros
CREATE TABLE siniestros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    seguro_id INTEGER REFERENCES seguros(id),
    numero_siniestro VARCHAR(50) UNIQUE NOT NULL,
    fecha_incidente DATE NOT NULL,
    lugar_incidente TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'reportado', -- 'reportado', 'en_proceso', 'cerrado', 'rechazado'
    monto_reclamado DECIMAL(12,2),
    monto_aprobado DECIMAL(12,2),
    documentos JSONB, -- URLs de documentos adjuntos
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de recomendados
CREATE TABLE recomendados (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id), -- quien recomienda
    nombre_completo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    tipo_interes VARCHAR(20), -- 'auto', 'sepelio', 'accidentes', 'todos'
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'contactado', 'convertido'
    comentarios TEXT,
    fecha_contacto TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones del sistema
CREATE TABLE configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_cotizaciones_usuario ON cotizaciones(usuario_id);
CREATE INDEX idx_cotizaciones_tipo ON cotizaciones(tipo_seguro);
CREATE INDEX idx_seguros_usuario ON seguros(usuario_id);
CREATE INDEX idx_seguros_poliza ON seguros(numero_poliza);
CREATE INDEX idx_siniestros_usuario ON siniestros(usuario_id);
CREATE INDEX idx_siniestros_seguro ON siniestros(seguro_id);
CREATE INDEX idx_recomendados_usuario ON recomendados(usuario_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cotizaciones_updated_at BEFORE UPDATE ON cotizaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seguros_updated_at BEFORE UPDATE ON seguros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_siniestros_updated_at BEFORE UPDATE ON siniestros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recomendados_updated_at BEFORE UPDATE ON recomendados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
