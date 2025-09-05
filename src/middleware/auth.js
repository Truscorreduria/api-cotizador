const jwt = require("jsonwebtoken")
const pool = require("../config/database")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario existe y está activo
    const result = await pool.query("SELECT id, email, rol, activo FROM usuarios WHERE id = $1", [decoded.userId])

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: "Usuario no válido" })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    return res.status(403).json({ error: "Token no válido" })
  }
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Permisos insuficientes" })
    }
    next()
  }
}

module.exports = { authenticateToken, requireRole }
