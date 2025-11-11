const jwt = require("jsonwebtoken")
const pool = require("../config/database")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⬇️ El token puede traer userId o id
    const userId = decoded?.userId ?? decoded?.id;
    if (!userId) {
      return res.status(403).json({ error: "Token no válido" });
    }

    const { rows } = await pool.query(
      "SELECT id, email, rol, activo, primer_nombre, primer_apellido FROM usuarios WHERE id = $1",
      [userId]
    );

    const user = rows[0];
    if (!user || !user.activo) {
      return res.status(401).json({ error: "Usuario no válido" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Error verificando JWT:", err.message);
    return res.status(403).json({ error: "Token no válido" });
  }
};



const requireRole = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !roles.includes(req.user.rol)) {
        return res.status(403).json({ error: "Permisos insuficientes" })
      }
      next()
    } catch (e) {
      return res.status(500).json({ error: "Error evaluando permisos" })
    }
  }
}

module.exports = { authenticateToken, requireRole }
