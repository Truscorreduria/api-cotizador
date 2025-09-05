const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const cotizacionesRoutes = require("./routes/cotizaciones")
const segurosRoutes = require("./routes/seguros")
const siniestrosRoutes = require("./routes/siniestros")
const recomendadosRoutes = require("./routes/recomendados")
const usuariosRoutes = require("./routes/usuarios")

const app = express()
const PORT = process.env.PORT || 3001

// Middleware de seguridad
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana de tiempo
})
app.use(limiter)

// Middleware para parsing
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Rutas
app.use("/api/auth", authRoutes)
app.use("/api/cotizaciones", cotizacionesRoutes)
app.use("/api/seguros", segurosRoutes)
app.use("/api/siniestros", siniestrosRoutes)
app.use("/api/recomendados", recomendadosRoutes)
app.use("/api/usuarios", usuariosRoutes)

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Trust Seguros API",
  })
})

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Algo salió mal!",
    message: process.env.NODE_ENV === "development" ? err.message : "Error interno del servidor",
  })
})

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || "development"}`)
})
