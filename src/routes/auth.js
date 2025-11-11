// routes/auth.js
const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Helper para emitir JWT con el nuevo payload { id, email, rol }
function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  )
}

// Normaliza email
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

// --------------------------------------
// Login
// --------------------------------------
router.post("/login", validateRequest(schemas.login), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const { password } = req.body

    // Buscar usuario (case-insensitive)
    const result = await pool.query(
      `SELECT id, email, password_hash, primer_nombre, primer_apellido, rol, activo
         FROM usuarios
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    const user = result.rows[0]

    if (!user.activo) {
      return res.status(401).json({ error: "Usuario inactivo" })
    }

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    // Generar JWT con payload { id, email, rol }
    const token = issueToken(user)

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.primer_nombre} ${user.primer_apellido}`.trim(),
        rol: user.rol,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// --------------------------------------
// Registro (público): por defecto rol = colaborador
// --------------------------------------
router.post("/register", validateRequest(schemas.register), async (req, res) => {
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
    } = req.body

    const emailNorm = normalizeEmail(email)

    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      "SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)",
      [emailNorm]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" })
    }

    // Hash del password
    const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10)
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Crear usuario. Rol por defecto: colaborador (coincide con el CHECK de la tabla).
    const result = await pool.query(
      `
      INSERT INTO usuarios (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        email, password_hash, telefono, celular, identificacion,
        departamento, municipio, direccion, rol, activo
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14
      )
      RETURNING id, email, primer_nombre, primer_apellido, rol, activo
    `,
      [
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        emailNorm,
        hashedPassword,
        telefono,
        celular,
        identificacion,
        departamento,
        municipio,
        direccion,
        "colaborador", // <-- rol por defecto
        true,          // activo
      ]
    )

    const newUser = result.rows[0]

    // Generar JWT con el payload nuevo
    const token = issueToken(newUser)

    res.status(201).json({
      message: "Usuario creado exitosamente",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        nombre: `${primer_nombre} ${primer_apellido}`.trim(),
        rol: newUser.rol,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// --------------------------------------
// Perfil actual (datos básicos)
// --------------------------------------
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
              telefono, celular, identificacion, departamento, municipio, direccion, rol, activo,
              fecha_registro, fecha_actualizacion
         FROM usuarios
        WHERE id = $1
        LIMIT 1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error en /me:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// --------------------------------------
// Cambio de contraseña del propio usuario
// --------------------------------------
router.patch("/me/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Faltan campos: currentPassword y newPassword" })
    }

    const result = await pool.query(
      `SELECT id, password_hash FROM usuarios WHERE id = $1 LIMIT 1`,
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return res.status(400).json({ error: "La contraseña actual no es correcta" })
    }

    const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10)
    const newHash = await bcrypt.hash(newPassword, saltRounds)

    await pool.query(
      `UPDATE usuarios SET password_hash = $1, fecha_actualizacion = NOW() WHERE id = $2`,
      [newHash, req.user.id]
    )

    res.json({ message: "Contraseña actualizada correctamente" })
  } catch (error) {
    console.error("Error en cambio de contraseña:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// --------------------------------------
// Verificar token (compat con frontend actual)
// --------------------------------------
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      rol: req.user.rol,
    },
  })
})

module.exports = router
