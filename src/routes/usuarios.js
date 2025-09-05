const express = require("express")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Obtener perfil del usuario
router.get("/perfil", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
             email, telefono, celular, identificacion, departamento, municipio,
             direccion, rol, created_at
      FROM usuarios WHERE id = $1
    `,
      [req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error obteniendo perfil:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Actualizar perfil del usuario
router.put("/perfil", authenticateToken, async (req, res) => {
  try {
    const {
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
      telefono,
      celular,
      departamento,
      municipio,
      direccion,
    } = req.body

    const result = await pool.query(
      `
      UPDATE usuarios SET
        primer_nombre = $1, segundo_nombre = $2, primer_apellido = $3,
        segundo_apellido = $4, telefono = $5, celular = $6,
        departamento = $7, municipio = $8, direccion = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                email, telefono, celular, identificacion, departamento, municipio, direccion
    `,
      [
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        telefono,
        celular,
        departamento,
        municipio,
        direccion,
        req.user.id,
      ],
    )

    res.json({
      message: "Perfil actualizado exitosamente",
      usuario: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener estadísticas del dashboard
router.get("/dashboard-stats", authenticateToken, async (req, res) => {
  try {
    // Seguros activos
    const segurosActivos = await pool.query(
      "SELECT COUNT(*) as count FROM seguros WHERE usuario_id = $1 AND estado = $2",
      [req.user.id, "activa"],
    )

    // Cotizaciones este mes
    const cotizacionesMes = await pool.query(
      `
      SELECT COUNT(*) as count FROM cotizaciones 
      WHERE usuario_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `,
      [req.user.id],
    )

    // Recomendados
    const recomendados = await pool.query("SELECT COUNT(*) as count FROM recomendados WHERE usuario_id = $1", [
      req.user.id,
    ])

    // Siniestros en proceso
    const siniestrosProceso = await pool.query(
      "SELECT COUNT(*) as count FROM siniestros WHERE usuario_id = $1 AND estado = $2",
      [req.user.id, "en_proceso"],
    )

    res.json({
      seguros_activos: Number.parseInt(segurosActivos.rows[0].count),
      cotizaciones_mes: Number.parseInt(cotizacionesMes.rows[0].count),
      recomendados: Number.parseInt(recomendados.rows[0].count),
      siniestros_proceso: Number.parseInt(siniestrosProceso.rows[0].count),
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router
