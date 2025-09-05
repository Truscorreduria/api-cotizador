-- =====================================================
-- ÍNDICES PARA OPTIMIZAR RENDIMIENTO
-- =====================================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_identificacion ON usuarios(identificacion);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Índices para cotizaciones
CREATE INDEX IF NOT EXISTS idx_cotizaciones_usuario ON cotizaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_tipo ON cotizaciones(tipo_seguro);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(numero_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha_creacion);

-- Índices para seguros
CREATE INDEX IF NOT EXISTS idx_seguros_usuario ON seguros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_seguros_poliza ON seguros(numero_poliza);
CREATE INDEX IF NOT EXISTS idx_seguros_tipo ON seguros(tipo_seguro);
CREATE INDEX IF NOT EXISTS idx_seguros_estado ON seguros(estado);
CREATE INDEX IF NOT EXISTS idx_seguros_vencimiento ON seguros(fecha_vencimiento);

-- Índices para siniestros
CREATE INDEX IF NOT EXISTS idx_siniestros_usuario ON siniestros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_siniestros_seguro ON siniestros(seguro_id);
CREATE INDEX IF NOT EXISTS idx_siniestros_numero ON siniestros(numero_siniestro);
CREATE INDEX IF NOT EXISTS idx_siniestros_estado ON siniestros(estado);
CREATE INDEX IF NOT EXISTS idx_siniestros_fecha_incidente ON siniestros(fecha_incidente);

-- Índices para recomendados
CREATE INDEX IF NOT EXISTS idx_recomendados_referente ON recomendados(usuario_referente_id);
CREATE INDEX IF NOT EXISTS idx_recomendados_estado ON recomendados(estado);
CREATE INDEX IF NOT EXISTS idx_recomendados_telefono ON recomendados(telefono);

-- Índices para configuraciones
CREATE INDEX IF NOT EXISTS idx_configuraciones_clave ON configuraciones(clave);
CREATE INDEX IF NOT EXISTS idx_configuraciones_categoria ON configuraciones(categoria);

-- Índices para archivos
CREATE INDEX IF NOT EXISTS idx_archivos_referencia ON archivos(tabla_referencia, id_referencia);
CREATE INDEX IF NOT EXISTS idx_archivos_usuario ON archivos(usuario_id);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_tabla ON logs_auditoria(tabla_afectada, id_registro);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_auditoria(fecha_accion);
