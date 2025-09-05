-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers para actualizar fecha_actualizacion
CREATE TRIGGER trigger_usuarios_fecha_actualizacion
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_cotizaciones_fecha_actualizacion
    BEFORE UPDATE ON cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_seguros_fecha_actualizacion
    BEFORE UPDATE ON seguros
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_siniestros_fecha_actualizacion
    BEFORE UPDATE ON siniestros
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trigger_recomendados_fecha_actualizacion
    BEFORE UPDATE ON recomendados
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- Triggers para generar números automáticamente
CREATE TRIGGER trigger_generar_numero_cotizacion
    BEFORE INSERT ON cotizaciones
    FOR EACH ROW
    WHEN (NEW.numero_cotizacion IS NULL)
    EXECUTE FUNCTION generar_numero_cotizacion();

CREATE TRIGGER trigger_generar_numero_poliza
    BEFORE INSERT ON seguros
    FOR EACH ROW
    WHEN (NEW.numero_poliza IS NULL)
    EXECUTE FUNCTION generar_numero_poliza();

CREATE TRIGGER trigger_generar_numero_siniestro
    BEFORE INSERT ON siniestros
    FOR EACH ROW
    WHEN (NEW.numero_siniestro IS NULL)
    EXECUTE FUNCTION generar_numero_siniestro();

-- Triggers de auditoría (opcional - comentar si no se necesita)
-- CREATE TRIGGER trigger_auditoria_usuarios
--     AFTER INSERT OR UPDATE OR DELETE ON usuarios
--     FOR EACH ROW
--     EXECUTE FUNCTION registrar_auditoria();

-- CREATE TRIGGER trigger_auditoria_cotizaciones
--     AFTER INSERT OR UPDATE OR DELETE ON cotizaciones
--     FOR EACH ROW
--     EXECUTE FUNCTION registrar_auditoria();
