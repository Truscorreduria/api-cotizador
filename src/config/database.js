const { Pool } = require("pg")
require("dotenv").config()

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  // Configuraciones adicionales para producción
  max: 20, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // tiempo de espera para obtener conexión
})

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query("SELECT NOW() as current_time, version() as version")
    console.log("✅ Conexión a PostgreSQL exitosa")
    console.log(`📅 Hora del servidor: ${result.rows[0].current_time}`)
    console.log(
      `🗄️  Versión PostgreSQL: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}`,
    )
    client.release()
  } catch (err) {
    console.error("❌ Error conectando a PostgreSQL:")
    console.error(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`)
    console.error(`   Database: ${process.env.DB_NAME}`)
    console.error(`   User: ${process.env.DB_USER}`)
    console.error(`   Error: ${err.message}`)
    process.exit(1)
  }
}

// Función para ejecutar queries con manejo de errores
const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Query ejecutado en ${duration}ms:`, text.substring(0, 100) + "...")
    }

    return res
  } catch (error) {
    console.error("❌ Error en query:", error.message)
    console.error("📝 Query:", text)
    console.error("📋 Params:", params)
    throw error
  }
}

// Función para obtener un cliente del pool (para transacciones)
const getClient = async () => {
  return await pool.connect()
}

// Función para cerrar el pool (útil para tests)
const closePool = async () => {
  await pool.end()
}

// Probar conexión al inicializar
testConnection()

module.exports = {
  pool,
  query,
  getClient,
  closePool,
}
