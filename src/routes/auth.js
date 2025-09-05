const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Login
router.post("/login", validateRequest(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body

    console.log("Intento de login para:", email, password)

    // Buscar usuario
    const result = await pool.query(
      "SELECT id, email, password_hash, primer_nombre, primer_apellido, rol, activo FROM usuarios WHERE email = $1",
      [email],
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

    // Generar JWT
    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    })

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.primer_nombre} ${user.primer_apellido}`,
        rol: user.rol,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Registro
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

    // Verificar si el usuario ya existe
    const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" })
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const result = await pool.query(
      `
      INSERT INTO usuarios (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        email, password_hash, telefono, celular, identificacion,
        departamento, municipio, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, email, primer_nombre, primer_apellido
    `,
      [
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        email,
        hashedPassword,
        telefono,
        celular,
        identificacion,
        departamento,
        municipio,
        direccion,
      ],
    )

    const newUser = result.rows[0]

    // Generar JWT
    const token = jwt.sign({ userId: newUser.id, email: newUser.email, rol: "cliente" }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    })

    res.status(201).json({
      message: "Usuario creado exitosamente",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        nombre: `${newUser.primer_nombre} ${newUser.primer_apellido}`,
        rol: "cliente",
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Verificar token
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
