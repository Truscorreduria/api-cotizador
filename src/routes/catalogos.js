const express = require("express")
const pool = require("../config/database")

const router = express.Router()

/**
 * GET /api/catalogos/marcas
 * Devuelve la lista de marcas (distinct) desde la tabla valor_de_nuevo.
 * Respuesta: ["Chevrolet","Honda","Hyundai","Kia","Nissan","Toyota", ...]
 */
router.get("/marcas", async (req, res) => {
  try {
    // Distinct + trim para evitar duplicados por espacios; filtra nulos y vacíos
    const result = await pool.query(
      `
      SELECT DISTINCT TRIM(marca) AS marca
      FROM valor_de_nuevo
      WHERE marca IS NOT NULL
        AND TRIM(marca) <> ''
      ORDER BY marca ASC
      `
    )

    // Devolvemos un array de strings
    const marcas = result.rows.map(r => r.marca)
    res.json(marcas)
  } catch (error) {
    console.error("Error obteniendo marcas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// GET /api/catalogos/modelos?marca=TOYOTA
router.get("/modelos", async (req, res) => {
  try {
    const { marca } = req.query

    if (!marca || typeof marca !== "string" || marca.trim() === "") {
      return res.status(400).json({ error: "Parámetro 'marca' es requerido" })
    }

    const pattern = `%${marca}%`
    const { rows } = await pool.query(
      `
      SELECT DISTINCT TRIM(modelo) AS modelo
      FROM valor_de_nuevo
      WHERE marca ILIKE $1
        AND modelo IS NOT NULL
        AND TRIM(modelo) <> ''
      ORDER BY modelo ASC
      `,
      [pattern],
    )

    res.json(rows.map((r) => r.modelo))
  } catch (error) {
    console.error("Error obteniendo modelos:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// GET /api/catalogos/anios?marca=TOYOTA&modelo=TUNDRA
router.get("/anios", async (req, res) => {
  try {
    const { marca, modelo } = req.query

    if (!marca || !modelo || typeof marca !== "string" || typeof modelo !== "string") {
      return res.status(400).json({ error: "Parámetros 'marca' y 'modelo' son requeridos" })
    }

    const { rows } = await pool.query(
      `
      SELECT DISTINCT anio
      FROM valor_de_nuevo
      WHERE TRIM(LOWER(marca))  = TRIM(LOWER($1))
        AND TRIM(LOWER(modelo)) = TRIM(LOWER($2))
        AND anio IS NOT NULL
      ORDER BY anio DESC
      `,
      [marca, modelo]
    )

    res.json(rows.map(r => r.anio))
  } catch (error) {
    console.error("Error obteniendo años:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
});

// GET /api/catalogos/departamentos
router.get("/departamentos", async (req, res) => {
  try {
    const { q } = req.query; // opcional, para filtrar por nombre
    let sql = `SELECT id, name FROM utils_departamento ORDER BY name ASC`;
    let params = [];

    if (q) {
      sql = `SELECT id, name FROM utils_departamento WHERE unaccent(LOWER(name)) LIKE unaccent(LOWER($1)) AND id not in (18) ORDER BY name ASC`;
      params = [`%${q}%`];
    }

    const result = await pool.query(sql, params);
    res.json(result.rows); // [{id, nombre}, ...]
  } catch (e) {
    console.error("Error /catalogos/departamentos:", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/catalogos/municipios?departamento_id=10
//    ó /api/catalogos/municipios?departamento=Managua// GET /api/catalogos/municipios?departamento=Managua[&q=man]
router.get("/municipios", async (req, res) => {
  try {
    const { departamento, q } = req.query;

    // Validación básica
    if (!departamento || typeof departamento !== "string" || departamento.trim() === "") {
      return res.status(400).json({ error: "Parámetro 'departamento' es requerido" });
    }

    // Patrón para ILIKE (similar al de modelos)
    const depPattern = `%${departamento.trim()}%`;

    // Si viene q, filtra municipios también por texto
    if (q && typeof q === "string" && q.trim() !== "") {
      const munPattern = `%${q.trim()}%`;
      const { rows } = await pool.query(
        `
        SELECT DISTINCT TRIM(m.name) AS name
        FROM utils_municipio m
        JOIN utils_departamento d ON d.id = m.departamento_id
        WHERE d.name ILIKE $1
          AND m.name ILIKE $2
          AND m.name IS NOT NULL
          AND TRIM(m.name) <> ''
        ORDER BY name ASC
        `,
        [depPattern, munPattern]
      );
      // Arreglo plano de nombres
      return res.json(rows.map(r => r.name));
    }

    // Sin q: solo por departamento
    const { rows } = await pool.query(
      `
      SELECT DISTINCT TRIM(m.name) AS name
      FROM utils_municipio m
      JOIN utils_departamento d ON d.id = m.departamento_id
      WHERE d.name ILIKE $1
        AND m.name IS NOT NULL
        AND TRIM(m.name) <> ''
      ORDER BY name ASC
      `,
      [depPattern]
    );

    // Arreglo plano de nombres
    return res.json(rows.map(r => r.name));
  } catch (error) {
    console.error("Error obteniendo municipios:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});
router.get("/municipios", async (req, res) => {
  try {
    let { departamento_id, departamento, q } = req.query;

    // 1) Si no viene departamento_id pero sí nombre, resolver el id
    if (!departamento_id && departamento) {
      // normaliza nombre (trim) – el unaccent/LOWER hace el resto en SQL
      const depName = String(departamento).trim();
      if (!depName) {
        return res.status(400).json({ error: "departamento es inválido" });
      }

      // Busca el ID por nombre (sin tildes y case-insensitive)
      const lookup = await pool.query(
        `
        SELECT id
        FROM utils_departamento
        WHERE unaccent(LOWER(name)) = unaccent(LOWER($1))
        LIMIT 1
        `,
        [depName]
      );

      if (lookup.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `No se encontró departamento '${depName}'` });
      }
      departamento_id = lookup.rows[0].id; // ← resolvemos el id
    }

    // 2) Validación final: necesitamos departamento_id
    if (!departamento_id) {
      return res
        .status(400)
        .json({ error: "departamento_id o departamento es requerido" });
    }

    // 3) Armar SQL de municipios
    let sql = `
      SELECT id, name, departamento_id
      FROM utils_municipio
      WHERE departamento_id = $1
      ORDER BY name ASC
    `;
    let params = [Number(departamento_id)];

    // Filtro por 'q' (texto) si viene
    if (q) {
      sql = `
        SELECT id, name, departamento_id
        FROM utils_municipio
        WHERE departamento_id = $1
          AND unaccent(LOWER(name)) LIKE unaccent(LOWER($2))
        ORDER BY name ASC
      `;
      params = [Number(departamento_id), `%${String(q).trim()}%`];
    }

    const result = await pool.query(sql, params);

    // (Opcional) Leve caché de 5min si tus datos no cambian con frecuencia
    res.set("Cache-Control", "public, max-age=300");

    return res.json(result.rows); // [{id, nombre, departamento_id}, ...]
  } catch (e) {
    console.error("Error /catalogos/municipios:", e);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router
