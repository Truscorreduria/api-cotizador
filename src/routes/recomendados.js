const express = require("express")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")
const { validateRequest, schemas } = require("../middleware/validation")

const router = express.Router()

// Obtener recomendados del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM recomendados WHERE usuario_id = $1 ORDER BY created_at DESC", [
      req.user.id,
    ])

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo recomendados:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Crear recomendado
router.post("/", authenticateToken, validateRequest(schemas.recomendado), async (req, res) => {
  try {
    const { nombre_completo, telefono, email, tipo_interes, comentarios } = req.body

    const result = await pool.query(
      `
      INSERT INTO recomendados (
        usuario_id, nombre_completo, telefono, email, tipo_interes, comentarios
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [req.user.id, nombre_completo, telefono, email, tipo_interes, comentarios],
    )

    res.status(201).json({
      message: "Recomendación enviada exitosamente",
      recomendado: result.rows[0],
    })
  } catch (error) {
    console.error("Error creando recomendado:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Actualizar estado de recomendado
router.patch("/:id/estado", authenticateToken, async (req, res) => {
  try {
    const { estado, fecha_contacto } = req.body

    if (!["pendiente", "contactado", "convertido"].includes(estado)) {
      return res.status(400).json({ error: "Estado no válido" })
    }

    const result = await pool.query(
      `
      UPDATE recomendados 
      SET estado = $1, fecha_contacto = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND usuario_id = $4
      RETURNING *
    `,
      [estado, fecha_contacto, req.params.id, req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recomendado no encontrado" })
    }

    res.json({
      message: "Estado actualizado exitosamente",
      recomendado: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando recomendado:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
