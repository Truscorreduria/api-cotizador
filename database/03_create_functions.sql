-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números únicos
CREATE OR REPLACE FUNCTION generar_numero_cotizacion()
RETURNS TRIGGER AS $$
DECLARE
    contador INTEGER;
    año INTEGER;
    numero VARCHAR(50);
BEGIN
    año := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COUNT(*) + 1 INTO contador
    FROM cotizaciones 
    WHERE EXTRACT(YEAR FROM fecha_creacion) = año;
    
    numero := 'COT-' || año || '-' || LPAD(contador::TEXT, 4, '0');
    
    NEW.numero_cotizacion := numero;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de póliza
CREATE OR REPLACE FUNCTION generar_numero_poliza()
RETURNS TRIGGER AS $$
DECLARE
    contador INTEGER;
    año INTEGER;
    prefijo VARCHAR(3);
    numero VARCHAR(50);
BEGIN
    año := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Determinar prefijo según tipo de seguro
    CASE NEW.tipo_seguro
        WHEN 'auto' THEN prefijo := 'AUT';
        WHEN 'sepelio' THEN prefijo := 'SEP';
        WHEN 'accidentes' THEN prefijo := 'ACC';
        ELSE prefijo := 'GEN';
    END CASE;
    
    SELECT COUNT(*) + 1 INTO contador
    FROM seguros 
    WHERE EXTRACT(YEAR FROM fecha_creacion) = año
    AND tipo_seguro = NEW.tipo_seguro;
    
    numero := prefijo || '-' || año || '-' || LPAD(contador::TEXT, 4, '0');
    
    NEW.numero_poliza := numero;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de siniestro
CREATE OR REPLACE FUNCTION generar_numero_siniestro()
RETURNS TRIGGER AS $$
DECLARE
    contador INTEGER;
    año INTEGER;
    numero VARCHAR(50);
BEGIN
    año := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COUNT(*) + 1 INTO contador
    FROM siniestros 
    WHERE EXTRACT(YEAR FROM fecha_creacion) = año;
    
    numero := 'SIN-' || año || '-' || LPAD(contador::TEXT, 4, '0');
    
    NEW.numero_siniestro := numero;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para auditoría
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO logs_auditoria (tabla_afectada, id_registro, accion, datos_anteriores)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO logs_auditoria (tabla_afectada, id_registro, accion, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO logs_auditoria (tabla_afectada, id_registro, accion, datos_nuevos)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
