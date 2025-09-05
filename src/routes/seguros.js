const express = require("express")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Obtener seguros del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT s.*, c.datos_cliente 
      FROM seguros s
      LEFT JOIN cotizaciones c ON s.cotizacion_id = c.id
      WHERE s.usuario_id = $1
      ORDER BY s.created_at DESC
    `,
      [req.user.id],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo seguros:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener seguro por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM seguros WHERE id = $1 AND usuario_id = $2", [
      req.params.id,
      req.user.id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seguro no encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error obteniendo seguro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Crear póliza desde cotización aprobada
router.post("/crear-desde-cotizacion/:cotizacionId", authenticateToken, async (req, res) => {
  try {
    // Verificar que la cotización existe y está aprobada
    const cotizacionResult = await pool.query(
      "SELECT * FROM cotizaciones WHERE id = $1 AND usuario_id = $2 AND estado = $3",
      [req.params.cotizacionId, req.user.id, "aprobada"],
    )

    if (cotizacionResult.rows.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada o no aprobada" })
    }

    const cotizacion = cotizacionResult.rows[0]

    // Generar número de póliza
    const numeroPoliza = `${cotizacion.tipo_seguro.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`

    // Fechas de vigencia (1 año)
    const fechaInicio = new Date()
    const fechaVencimiento = new Date()
    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1)

    const result = await pool.query(
      `
      INSERT INTO seguros (
        usuario_id, cotizacion_id, numero_poliza, tipo_seguro,
        fecha_inicio, fecha_vencimiento, prima_anual, suma_asegurada,
        datos_asegurado, coberturas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        req.user.id,
        cotizacion.id,
        numeroPoliza,
        cotizacion.tipo_seguro,
        fechaInicio,
        fechaVencimiento,
        cotizacion.prima_calculada,
        25000,
        cotizacion.datos_cliente,
        cotizacion.datos_cobertura,
      ],
    )

    res.status(201).json({
      message: "Póliza creada exitosamente",
      seguro: result.rows[0],
    })
  } catch (error) {
    console.error("Error creando póliza:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
