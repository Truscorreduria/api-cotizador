const express = require("express")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")
const { validateRequest, schemas } = require("../middleware/validation")

const router = express.Router()

// Obtener cotizaciones del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { tipo_seguro, estado } = req.query

    let query = "SELECT * FROM cotizaciones WHERE usuario_id = $1"
    const params = [req.user.id]

    if (tipo_seguro) {
      query += " AND tipo_seguro = $2"
      params.push(tipo_seguro)
    }

    if (estado) {
      query += ` AND estado = $${params.length + 1}`
      params.push(estado)
    }

    query += " ORDER BY created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo cotizaciones:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Crear cotización de auto
router.post("/auto", authenticateToken, validateRequest(schemas.cotizacionAuto), async (req, res) => {
  try {
    const {
      marca,
      modelo,
      año,
      tipoCobertura,
      excesoRC,
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      email,
      telefono,
      celular,
      identificacion,
      departamento,
      municipio,
      direccion,
      parentesco,
      chasis,
      motor,
      color,
      placa,
      usoVehiculo,
      vigencia,
      circulacionDueño,
      vehiculoDañado,
      cesionDerechos,
      formaPago,
    } = req.body

    // Calcular prima básica (esto se puede hacer más sofisticado)
    const primaBase = 800 // Desde configuración
    const factorAño = año >= 2020 ? 1.2 : año >= 2015 ? 1.0 : 0.8
    const primaCalculada = primaBase * factorAño

    const datosVehiculo = {
      marca,
      modelo,
      año,
      chasis,
      motor,
      color,
      placa,
      usoVehiculo,
      vigencia,
      circulacionDueño,
      vehiculoDañado,
      cesionDerechos,
    }

    const datosCliente = {
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      email,
      telefono,
      celular,
      identificacion,
      departamento,
      municipio,
      direccion,
      parentesco,
    }

    const datosCobertura = {
      tipoCobertura,
      excesoRC,
    }

    const result = await pool.query(
      `
      INSERT INTO cotizaciones (
        usuario_id, tipo_seguro, datos_vehiculo, datos_cliente,
        datos_cobertura, forma_pago, prima_calculada
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        req.user.id,
        "auto",
        JSON.stringify(datosVehiculo),
        JSON.stringify(datosCliente),
        JSON.stringify(datosCobertura),
        formaPago,
        primaCalculada,
      ],
    )

    res.status(201).json({
      message: "Cotización creada exitosamente",
      cotizacion: result.rows[0],
    })
  } catch (error) {
    console.error("Error creando cotización:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener cotización por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cotizaciones WHERE id = $1 AND usuario_id = $2", [
      req.params.id,
      req.user.id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error obteniendo cotización:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Actualizar estado de cotización (solo admin)
router.patch("/:id/estado", authenticateToken, async (req, res) => {
  try {
    const { estado, observaciones } = req.body

    if (!["pendiente", "aprobada", "rechazada", "en_revision"].includes(estado)) {
      return res.status(400).json({ error: "Estado no válido" })
    }

    const result = await pool.query(
      `
      UPDATE cotizaciones 
      SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `,
      [estado, observaciones, req.params.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" })
    }

    res.json({
      message: "Estado actualizado exitosamente",
      cotizacion: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando cotización:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
