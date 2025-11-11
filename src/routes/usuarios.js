// src/routes/usuarios.js
const express = require("express")
const bcrypt = require("bcryptjs")
const Joi = require("joi")
const pool = require("../config/database")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validateRequest, validateQuery, validateParams, schemas } = require("../middleware/validation")

const router = express.Router()

// ---------- Schemas locales (query, params y acciones específicas) ----------
const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
})

const listQuerySchema = Joi.object({
  q: Joi.string().allow("").optional(),
  rol: Joi.string().valid("administrador", "colaborador", "cliente").optional(),
  activo: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
})

const adminResetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
})

const adminSetStatusSchema = Joi.object({
  activo: Joi.boolean().required(),
})

// ---------- Helpers ----------
const publicUserFields = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  email, telefono, celular, identificacion,
  departamento, municipio, direccion, rol, activo,
  fecha_registro, fecha_actualizacion
`

const mapUser = (row) => ({
  id: row.id,
  primer_nombre: row.primer_nombre,
  segundo_nombre: row.segundo_nombre,
  primer_apellido: row.primer_apellido,
  segundo_apellido: row.segundo_apellido,
  email: row.email,
  telefono: row.telefono,
  celular: row.celular,
  identificacion: row.identificacion,
  departamento: row.departamento,
  municipio: row.municipio,
  direccion: row.direccion,
  rol: row.rol,
  activo: row.activo,
  fecha_registro: row.fecha_registro,
  fecha_actualizacion: row.fecha_actualizacion,
})

// ======================================================================
// LISTAR USUARIOS (admin)
// GET /api/usuarios?q=&rol=&activo=&limit=&offset=
// ======================================================================
router.get(
  "/",
  authenticateToken,
  requireRole(["administrador"]),
  validateQuery(listQuerySchema),
  async (req, res) => {
    try {
      const { q, rol, activo, limit, offset } = req.query

      const where = []
      const params = []

      if (q && q.trim() !== "") {
        params.push(`%${q.trim()}%`)
        where.push(
          `( (primer_nombre || ' ' || coalesce(segundo_nombre,'') || ' ' || primer_apellido || ' ' || coalesce(segundo_apellido,'')) ILIKE $${params.length}
             OR email ILIKE $${params.length}
             OR identificacion ILIKE $${params.length} )`
        )
      }

      if (rol) {
        params.push(rol)
        where.push(`rol = $${params.length}`)
      }

      if (typeof activo === "boolean") {
        params.push(activo)
        where.push(`activo = $${params.length}`)
      }

      const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : ""

      // total
      const countSQL = `SELECT COUNT(*)::int AS total FROM usuarios ${whereSQL}`
      const { rows: countRows } = await pool.query(countSQL, params)
      const total = countRows[0]?.total ?? 0

      // data con paginación
      params.push(limit)
      params.push(offset)
      const dataSQL = `
        SELECT ${publicUserFields}
        FROM usuarios
        ${whereSQL}
        ORDER BY fecha_registro DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `
      const { rows } = await pool.query(dataSQL, params)

      res.json({
        data: rows.map(mapUser),
        pagination: { total, limit, offset },
      })
    } catch (err) {
      console.error("Error listando usuarios:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

// ======================================================================
// OBTENER USUARIO POR ID (admin)
// GET /api/usuarios/:id
// ======================================================================
router.get(
  "/:id",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params
      const { rows } = await pool.query(
        `SELECT ${publicUserFields} FROM usuarios WHERE id = $1`,
        [id]
      )
      if (rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" })
      }
      res.json(mapUser(rows[0]))
    } catch (err) {
      console.error("Error obteniendo usuario:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

// ======================================================================
// CREAR USUARIO (admin)
// POST /api/usuarios
// Body: schemas.usuarioAdminCreate
// ======================================================================
router.post(
  "/",
  authenticateToken,
  requireRole(["administrador"]),
  validateRequest(schemas.usuarioAdminCreate),
  async (req, res) => {
    try {
      const {
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        email,
        password,
        telefono,
        celular,
        identificacion,
        departamento,
        municipio,
        direccion,
        rol,
        activo = true,
      } = req.body

      // email único
      const existing = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email])
      if (existing.rows.length) {
        return res.status(400).json({ error: "El email ya está registrado" })
      }

      const password_hash = await bcrypt.hash(password, 10)

      const insertSQL = `
        INSERT INTO usuarios (
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          email, password_hash, telefono, celular, identificacion,
          departamento, municipio, direccion, rol, activo
        ) VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14
        )
        RETURNING ${publicUserFields}
      `
      const params = [
        primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null,
        email, password_hash, telefono || null, celular || null, identificacion || null,
        departamento || null, municipio || null, direccion || null, rol, !!activo,
      ]
      const { rows } = await pool.query(insertSQL, params)

      res.status(201).json({ message: "Usuario creado", user: mapUser(rows[0]) })
    } catch (err) {
      console.error("Error creando usuario:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

// ======================================================================
// ACTUALIZAR USUARIO (admin) - sin password
// PATCH /api/usuarios/:id  (update parcial - recomendado)
// Alias: PUT /api/usuarios/:id  (redirige a PATCH handler)
// Body: schemas.usuarioAdminUpdate
// ======================================================================

// Handler común para PATCH/PUT
async function updateUserHandler(req, res) {
  try {
    const { id } = req.params

    // Campos permitidos
    const fields = [
      "primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido",
      "telefono", "celular", "identificacion",
      "departamento", "municipio", "direccion",
      "rol", "activo",
    ]

    const sets = []
    const params = []
    fields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        params.push(req.body[f])
        sets.push(`${f} = $${params.length}`)
      }
    })

    if (!sets.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" })
    }

    // Fecha de actualización
    sets.push(`fecha_actualizacion = NOW()`)

    params.push(id)
    const sql = `
      UPDATE usuarios
      SET ${sets.join(", ")}
      WHERE id = $${params.length}
      RETURNING ${publicUserFields}
    `
    const { rows } = await pool.query(sql, params)
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" })

    res.json({ message: "Usuario actualizado", user: mapUser(rows[0]) })
  } catch (err) {
    console.error("Error actualizando usuario:", err)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// PATCH real
router.patch(
  "/:id",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  validateRequest(schemas.usuarioAdminUpdate),
  updateUserHandler
)

// Alias PUT -> usa el mismo handler
router.put(
  "/:id",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  validateRequest(schemas.usuarioAdminUpdate),
  updateUserHandler
)

// ======================================================================
// RESETEAR PASSWORD (admin)
// PATCH /api/usuarios/:id/password
// Body: { newPassword }
// ======================================================================
router.patch(
  "/:id/password",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  validateRequest(adminResetPasswordSchema),
  async (req, res) => {
    try {
      const { id } = req.params
      const { newPassword } = req.body

      const password_hash = await bcrypt.hash(newPassword, 10)
      const { rows } = await pool.query(
        `
        UPDATE usuarios
        SET password_hash = $1, fecha_actualizacion = NOW()
        WHERE id = $2
        RETURNING ${publicUserFields}
        `,
        [password_hash, id]
      )

      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" })
      res.json({ message: "Password actualizado", user: mapUser(rows[0]) })
    } catch (err) {
      console.error("Error reseteando password:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

// ======================================================================
// ACTIVAR/DESACTIVAR (admin)
// PATCH /api/usuarios/:id/status
// Body: { activo: boolean }
// ======================================================================
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  validateRequest(adminSetStatusSchema),
  async (req, res) => {
    try {
      const { id } = req.params
      const { activo } = req.body

      const { rows } = await pool.query(
        `
        UPDATE usuarios
        SET activo = $1, fecha_actualizacion = NOW()
        WHERE id = $2
        RETURNING ${publicUserFields}
        `,
        [!!activo, id]
      )

      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" })
      res.json({ message: `Usuario ${activo ? "activado" : "desactivado"}`, user: mapUser(rows[0]) })
    } catch (err) {
      console.error("Error cambiando estado de usuario:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

// ======================================================================
// "Eliminar" (admin) -> Soft delete = activo = false
// DELETE /api/usuarios/:id
// ======================================================================
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["administrador"]),
  validateParams(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params
      const { rows } = await pool.query(
        `
        UPDATE usuarios
        SET activo = FALSE, fecha_actualizacion = NOW()
        WHERE id = $1
        RETURNING ${publicUserFields}
        `,
        [id]
      )
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" })
      res.json({ message: "Usuario desactivado (soft delete)", user: mapUser(rows[0]) })
    } catch (err) {
      console.error("Error desactivando usuario:", err)
      res.status(500).json({ error: "Error interno del servidor" })
    }
  }
)

module.exports = router
