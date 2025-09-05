const fs = require("fs")
const path = require("path")
const pool = require("../config/database")

const runMigrations = async () => {
  try {
    console.log("🔄 Ejecutando migraciones...")

    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    // Dividir el schema en comandos individuales
    const commands = schema.split(";").filter((cmd) => cmd.trim().length > 0)

    for (const command of commands) {
      if (command.trim()) {
        await pool.query(command)
      }
    }

    console.log("✅ Migraciones ejecutadas exitosamente")
  } catch (error) {
    console.error("❌ Error ejecutando migraciones:", error)
  } finally {
    await pool.end()
  }
}

runMigrations()
