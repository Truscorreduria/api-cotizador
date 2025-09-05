const pool = require("../config/database")
const bcrypt = require("bcryptjs")

const seedData = async () => {
  try {
    console.log("🌱 Sembrando datos iniciales...")

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash("admin123", 10)

    await pool.query(
      `
      INSERT INTO usuarios (
        primer_nombre, primer_apellido, email, password_hash, 
        telefono, rol, identificacion, departamento, municipio, direccion
      ) VALUES (
        'Administrador', 'Sistema', 'admin@trustseguros.com', $1,
        '+505-8888-8888', 'admin', '001-010101-0001A', 'Managua', 'Managua',
        'Oficina Central Trust Seguros'
      ) ON CONFLICT (email) DO NOTHING
    `,
      [hashedPassword],
    )

    // Crear usuario demo
    const demoPassword = await bcrypt.hash("demo123", 10)

    await pool.query(
      `
      INSERT INTO usuarios (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        email, password_hash, telefono, celular, identificacion,
        departamento, municipio, direccion
      ) VALUES (
        'Juan', 'Carlos', 'Pérez', 'González',
        'juan@email.com', $1, '+505-2222-2222', '+505-8888-1234',
        '001-123456-0001A', 'Managua', 'Managua', 'Barrio San Juan, Casa #123'
      ) ON CONFLICT (email) DO NOTHING
    `,
      [demoPassword],
    )

    // Insertar configuraciones del sistema
    const configuraciones = [
      ["prima_base_auto", "800.00", "Prima base para seguros de automóvil"],
      ["prima_base_sepelio", "500.00", "Prima base para seguros de sepelio"],
      ["prima_base_accidentes", "1200.00", "Prima base para seguros de accidentes"],
      ["iva_porcentaje", "15.00", "Porcentaje de IVA aplicable"],
      ["comision_recomendado", "50.00", "Comisión por cliente recomendado"],
    ]

    for (const [clave, valor, descripcion] of configuraciones) {
      await pool.query(
        `
        INSERT INTO configuraciones (clave, valor, descripcion)
        VALUES ($1, $2, $3)
        ON CONFLICT (clave) DO UPDATE SET valor = $2, descripcion = $3
      `,
        [clave, valor, descripcion],
      )
    }

    console.log("✅ Datos iniciales sembrados exitosamente")
    console.log("👤 Usuario admin: admin@trustseguros.com / admin123")
    console.log("👤 Usuario demo: juan@email.com / demo123")
  } catch (error) {
    console.error("❌ Error sembrando datos:", error)
  } finally {
    await pool.end()
  }
}

seedData()
