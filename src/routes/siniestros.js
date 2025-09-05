const express = require("express")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")
const { validateRequest, schemas } = require("../middleware/validation")

const router = express.Router()

// Obtener siniestros del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT s.*, seg.numero_poliza, seg.tipo_seguro
      FROM siniestros s
      JOIN seguros seg ON s.seguro_id = seg.id
      WHERE s.usuario_id = $1
      ORDER BY s.created_at DESC
    `,
      [req.user.id],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo siniestros:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Crear siniestro
router.post("/", authenticateToken, validateRequest(schemas.siniestro), async (req, res) => {
  try {
    const { seguro_id, fecha_incidente, lugar_incidente, descripcion, monto_reclamado } = req.body

    // Verificar que el seguro pertenece al usuario
    const seguroResult = await pool.query("SELECT * FROM seguros WHERE id = $1 AND usuario_id = $2 AND estado = $3", [
      seguro_id,
      req.user.id,
      "activa",
    ])

    if (seguroResult.rows.length === 0) {
      return res.status(404).json({ error: "Seguro no encontrado o no activo" })
    }

    // Generar número de siniestro
    const numeroSiniestro = `SIN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`

    const result = await pool.query(
      `
      INSERT INTO siniestros (
        usuario_id, seguro_id, numero_siniestro, fecha_incidente,
        lugar_incidente, descripcion, monto_reclamado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [req.user.id, seguro_id, numeroSiniestro, fecha_incidente, lugar_incidente, descripcion, monto_reclamado],
    )

    res.status(201).json({
      message: "Siniestro reportado exitosamente",
      siniestro: result.rows[0],
    })
  } catch (error) {
    console.error("Error creando siniestro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener siniestro por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT s.*, seg.numero_poliza, seg.tipo_seguro
      FROM siniestros s
      JOIN seguros seg ON s.seguro_id = seg.id
      WHERE s.id = $1 AND s.usuario_id = $2
    `,
      [req.params.id, req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Siniestro no encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error obteniendo siniestro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
