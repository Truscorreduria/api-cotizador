-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Configuraciones del sistema
INSERT INTO configuraciones (clave, valor, descripcion, tipo, categoria) VALUES
('prima_base_auto', '800.00', 'Prima base para seguros de automóvil', 'number', 'primas'),
('prima_base_sepelio', '500.00', 'Prima base para seguros de sepelio', 'number', 'primas'),
('prima_base_accidentes', '1200.00', 'Prima base para seguros de accidentes', 'number', 'primas'),
('iva_porcentaje', '15.00', 'Porcentaje de IVA aplicable', 'number', 'impuestos'),
('derecho_emision', '5.18', 'Derecho de emisión fijo', 'number', 'impuestos'),
('comision_recomendado', '50.00', 'Comisión por cliente recomendado convertido', 'number', 'comisiones'),
('email_notificaciones', 'notificaciones@trustseguros.com', 'Email para notificaciones del sistema', 'string', 'email'),
('telefono_emergencia', '+505-2222-2222', 'Teléfono de emergencia 24/7', 'string', 'contacto'),
('direccion_oficina', 'Managua, Nicaragua', 'Dirección de oficina principal', 'string', 'contacto')
ON CONFLICT (clave) DO NOTHING;

-- Usuario administrador por defecto
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO usuarios (
    primer_nombre, primer_apellido, email, password_hash, 
    telefono, rol, identificacion, departamento, municipio, direccion
) VALUES (
    'Administrador', 'Sistema', 'admin@trustseguros.com', 
    '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ',
    '+505-8888-8888', 'admin', '001-010101-0001A', 'Managua', 'Managua',
    'Oficina Central Trust Seguros'
) ON CONFLICT (email) DO NOTHING;

-- Usuario demo para pruebas
-- Contraseña: demo123 (hasheada con bcrypt)
INSERT INTO usuarios (
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    email, password_hash, telefono, celular, identificacion,
    departamento, municipio, direccion
) VALUES (
    'Juan', 'Carlos', 'Pérez', 'González',
    'demo@trustseguros.com', 
    '$2b$10$demo123hashedpasswordexampledemohash123456789',
    '+505-2222-2222', '+505-8888-1234',
    '001-123456-0001A', 'Managua', 'Managua', 'Barrio San Juan, Casa #123'
) ON CONFLICT (email) DO NOTHING;
