const express = require("express");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, schemas } = require("../middleware/validation");

const axios = require("axios");
const FormData = require("form-data");

const path = require("path");
const fs = require("fs/promises");

// ⬇️ Utilidad para renderizar PDF (CommonJS)
const { renderPdfFromHtml } = require("../utils/pdf");

//utilidad para envios multiples de archivo adjuntos

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// ───────────────────────────────────────────────────────────────────────────────

const router = express.Router();

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "trustcorreduria.com";
const MAILGUN_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

// helpers arriba del router (o al inicio del archivo)
const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const normalizeRecipients = (to) => {
  if (Array.isArray(to)) {
    return to.map((x) => String(x).trim()).filter(isEmail);
  }
  if (typeof to === "string") {
    return to
      .split(/[;,]/) // permite "a@b.com,c@d.com" o con ;
      .map((x) => x.trim())
      .filter(isEmail);
  }
  return [];
};
const usd = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "";

// ───────────────────────────────────────────────────────────────────────────────
// Plantilla HTML para PDF (y se puede reutilizar para previsualización)
// ───────────────────────────────────────────────────────────────────────────────
function buildPdfHtml({
  marca,
  modelo,
  anio,
  items,
  total,
  clienteNombre,
  fecha,
}) {
  const rows = (Array.isArray(items) ? items : [])
    .map((it) => {
      const suma =
        it?.sumaAseguradaLabel != null
          ? it.sumaAseguradaLabel
          : it?.sumaAsegurada != null
          ? Number(it.sumaAsegurada).toLocaleString("es-NI", {
              style: "currency",
              currency: "USD",
            })
          : "—";
      const prima = Number(it?.prima || 0).toLocaleString("es-NI", {
        style: "currency",
        currency: "USD",
      });

      return `
        <tr>
          <td class="cell text-left">${it?.nombre ?? ""}</td>
          <td class="cell">${suma}</td>
          <td class="cell">${it?.deducible ?? ""}</td>
          <td class="cell">${prima}</td>
        </tr>
      `;
    })
    .join("");

  const totalLabel = Number(total || 0).toLocaleString("es-NI", {
    style: "currency",
    currency: "USD",
  });

  return /* html */ `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Cotización de Seguro de Automóvil</title>
<style>
  @page { size: A4; margin: 18mm 14mm 20mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
    color: #0f172a;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }

  .muted { color:#475569; }
  .tiny { font-size: 11px; }
  .small { font-size: 12px; }
  .base { font-size: 13px; }
  .title-lg { font-size: 18px; font-weight: 700; }

  /* Contenedor */
  .container {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }

  /* Header corporativo */
  .header {
    display:flex; justify-content:space-between; align-items:center;
    padding: 14px 18px;
    background: #eaf2ff;
    border-bottom: 1px solid #dbeafe;
  }
  .brand { display:flex; align-items:center; gap:14px; }
  .brand img { height:46px; display:block; }
  .brand-meta { line-height:1.35; font-size: 12px; color:#374151; }
  .brand-title { font-weight:700; font-size:14px; color:#111827; }
  .meta-block { text-align:right; line-height:1.5; font-size: 12px; color:#374151; }

  /* Secciones */
  .sections { padding: 16px 18px; }

  .card {
    border:1px solid #e5e7eb;
    border-radius: 10px;
    overflow:hidden;
    margin-top: 16px;
  }
  .card-head {
    background:#f3f4f6;
    border-bottom:1px solid #e5e7eb;
    padding: 10px 12px;
    font-weight: 700;
    color:#111827;
  }
  .card-body { padding: 12px; }

  /* Grid Datos Vehículo */
  .grid {
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px 14px;
  }
  .kpi .k { font-size:12px; color:#475569; text-transform:uppercase; }
  .kpi .v { font-size:13px; font-weight:700; color:#0f172a; }

  /* Tabla Coberturas */
  table { width:100%; border-collapse: collapse; margin-top: 8px; }
  thead { background:#f3f4f6; display: table-header-group; }
  thead th {
    font-weight:700; font-size:12px; color:#0f172a;
    padding:10px 12px; border-bottom:1px solid #e5e7eb;
    text-align:right;
  }
  thead th:first-child { text-align:left; }
  tbody td {
    font-size:12px; color:#0f172a;
    padding:9px 12px; border-bottom:1px solid #e5e7eb; text-align:right;
  }
  tbody td:first-child { text-align:left; }
  tfoot td {
    padding:12px; border-top:1px solid #e5e7eb;
    font-weight:700; font-size:13px; color:#0f172a;
    text-align:right;
  }
  tfoot td:first-child { text-align:left; }

  /* Total destacado */
  .total-box {
    margin-top: 12px;
    border:1px solid #dbeafe;
    background: #eff6ff;
    border-radius: 10px;
    display:flex; align-items:center; justify-content:space-between;
    padding: 12px 14px;
  }
  .total-box .label { color:#1f2937; font-weight:700; }
  .total-box .value { font-weight:800; font-size: 16px; color:#0b5ed7; }

  /* Footer */
  .doc-footer {
    border-top:1px solid #e5e7eb;
    padding: 10px 18px;
    color:#475569; font-size:11px; margin-top: 20px;
  }
</style>
</head>
<body>

  <div class="container">
    <!-- Header corporativo -->
    <div class="header">
      <div class="brand">
        <img src="https://www.trustcorreduria.com/static/seguros/wp-content/uploads/2018/05/trust-logo-300px.png" alt="Trust Correduría de Seguros" />
        <div class="brand-meta">
          <div class="brand-title">Trust Correduría de Seguros</div>
          <div>Managua, Nicaragua</div>
          <div>Tel. (505) 2251 0108 • contacto@trustcorreduria.com</div>
          <div>www.trustcorreduria.com</div>
        </div>
      </div>
      <div class="meta-block">
        <div><strong>Fecha:</strong> ${fecha}</div>
        ${
          clienteNombre
            ? `<div><strong>Cliente:</strong> ${clienteNombre}</div>`
            : ""
        }
      </div>
    </div>

    <div class="sections">
      <div class="title-lg">Indicativo de Costo y Cobertura – Seguro de Automóvil</div>

      <!-- Datos del vehículo -->
      <div class="card">
        <div class="card-head">Datos del Vehículo</div>
        <div class="card-body">
          <div class="grid">
            <div class="kpi"><div class="k">Marca</div><div class="v">${
              marca ?? ""
            }</div></div>
            <div class="kpi"><div class="k">Modelo</div><div class="v">${
              modelo ?? ""
            }</div></div>
            <div class="kpi"><div class="k">Año</div><div class="v">${
              anio ?? ""
            }</div></div>
          </div>
        </div>
      </div>

      <!-- Coberturas -->
      <div class="card">
        <div class="card-head">Detalle de Coberturas</div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Detalle de Coberturas</th>
                <th>Suma Asegurada</th>
                <th>Deducible</th>
                <th>Prima</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:12px">Sin coberturas calculadas</td></tr>`
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Total a Pagar:</td>
                <td>${totalLabel}</td>
              </tr>
            </tfoot>
          </table>

          <div class="total-box">
            <div class="label">Total a pagar (USD)</div>
            <div class="value">${totalLabel}</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="doc-footer">
        Más que una Alianza de Negocios, Una Relación de Confianza.<br/>
        *Documento de referencia, no constituye póliza. Sujeto a verificación y condiciones de la aseguradora.
      </div>
    </div>
  </div>

</body>
</html>
`;
}

// ───────────────────────────────────────────────────────────────────────────────
// Rutas
// ───────────────────────────────────────────────────────────────────────────────

// Obtener cotizaciones del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { tipo_seguro, estado } = req.query;

    let query = "SELECT * FROM cotizaciones WHERE usuario_id = $1";
    const params = [req.user.id];

    if (tipo_seguro) {
      query += " AND tipo_seguro = $2";
      params.push(tipo_seguro);
    }

    if (estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(estado);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo cotizaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear cotización de auto
router.post(
  "/auto",
  authenticateToken,
  validateRequest(schemas.cotizacionAuto),
  async (req, res) => {
    try {
      const {
        marca,
        modelo,
        año,
        tipoCobertura,
        excesoRC,
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email,
        telefono,
        celular,
        identificacion,
        departamento,
        municipio,
        direccion,
        parentesco,
        chasis,
        motor,
        color,
        placa,
        usoVehiculo,
        vigencia,
        circulacionDueño,
        vehiculoDañado,
        cesionDerechos,
        formaPago,
      } = req.body;

      // Calcular prima básica (esto se puede hacer más sofisticado)
      const primaBase = 800; // Desde configuración
      const factorAño = año >= 2020 ? 1.2 : año >= 2015 ? 1.0 : 0.8;
      const primaCalculada = primaBase * factorAño;

      const datosVehiculo = {
        marca,
        modelo,
        año,
        chasis,
        motor,
        color,
        placa,
        usoVehiculo,
        vigencia,
        circulacionDueño,
        vehiculoDañado,
        cesionDerechos,
      };

      const datosCliente = {
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email,
        telefono,
        celular,
        identificacion,
        departamento,
        municipio,
        direccion,
        parentesco,
      };

      const datosCobertura = {
        tipoCobertura,
        excesoRC,
      };

      const result = await pool.query(
        `
      INSERT INTO cotizaciones (
        usuario_id, tipo_seguro, datos_vehiculo, datos_cliente,
        datos_cobertura, forma_pago, prima_calculada
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
        [
          req.user.id,
          "auto",
          JSON.stringify(datosVehiculo),
          JSON.stringify(datosCliente),
          JSON.stringify(datosCobertura),
          formaPago,
          primaCalculada,
        ]
      );

      res.status(201).json({
        message: "Cotización creada exitosamente",
        cotizacion: result.rows[0],
      });
    } catch (error) {
      console.error("Error creando cotización:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// Obtener cotización por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cotizaciones WHERE id = $1 AND usuario_id = $2",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo cotización:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar estado de cotización (solo admin)
router.patch("/:id/estado", authenticateToken, async (req, res) => {
  try {
    const { estado, observaciones } = req.body;

    if (
      !["pendiente", "aprobada", "rechazada", "en_revision"].includes(estado)
    ) {
      return res.status(400).json({ error: "Estado no válido" });
    }

    const result = await pool.query(
      `
      UPDATE cotizaciones 
      SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `,
      [estado, observaciones, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }

    res.json({
      message: "Estado actualizado exitosamente",
      cotizacion: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando cotización:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────────
   Cálculo de tabla de cotización
   GET /api/cotizaciones/auto/calculo?marca=TOYOTA&modelo=TUNDRA&anio=2021&tipoCobertura=amplia|exceso&excesoRC=2500
────────────────────────────────────────────────────────────────────────────── */
router.get("/auto/calculo", async (req, res) => {
  try {
    const {
      marca,
      modelo,
      anio,
      tipoCobertura = "amplia",
      excesoRC = "0",
    } = req.query;
    if (!marca || !modelo || !anio) {
      return res
        .status(400)
        .json({ error: "Parámetros requeridos: marca, modelo, anio" });
    }

    // 1) valor_nuevo
    const vnq = await pool.query(
      `
      SELECT MAX(valor_nuevo)::numeric AS valor_nuevo
      FROM valor_de_nuevo
      WHERE UPPER(marca) = UPPER($1)
        AND UPPER(modelo) = UPPER($2)
        AND anio = $3
      `,
      [marca, modelo, anio]
    );
    const valor_nuevo = Number(vnq.rows?.[0]?.valor_nuevo ?? 0);
    if (!valor_nuevo) {
      return res.status(404).json({
        error: "No se encontró valor_nuevo para los parámetros dados.",
      });
    }

    // 2) factor de depreciación
    const depq = await pool.query(
      `SELECT factor_conversion FROM depreciacion WHERE anio = $1 LIMIT 1`,
      [anio]
    );
    const factor_conversion = Number(depq.rows?.[0]?.factor_conversion ?? 1);

    // 3) suma asegurada
    const suma_asegurada = valor_nuevo * factor_conversion;

    // 4) primas base
    const prima_danos = (valor_nuevo * 11.5) / 1000;
    const derecho_emision = prima_danos * 0.02;
    const iva = (prima_danos + derecho_emision) * 0.15;
    const soa = 55;
    const prima_total = prima_danos + derecho_emision + iva + soa;

    // 5) exceso (si aplica)
    const exceso = Number(excesoRC || 0);
    let extra_exceso = 0;
    let prima_total_con_exceso = prima_total;
    if (String(tipoCobertura).toLowerCase() === "exceso" && exceso > 0) {
      // (((exceso * 6.6666) / 1000) * 1.02) * 1.15
      extra_exceso = ((exceso * 6.6666) / 1000) * 1.02 * 1.15;
      prima_total_con_exceso = prima_total + extra_exceso;
    }

    // 6) items de tabla (todas las filas + deducibles; se sobreescriben las afectadas)
    const baseItems = [
      {
        nombre:
          "Responsabilidad Civil Del Conductor Por Muerte O Lesiones A Pasajeros",
        sumaAsegurada: 10000,
        deducible: "",
        prima: 0,
      },
      {
        nombre: "Gastos Médicos",
        sumaAsegurada: 10000,
        deducible: "",
        prima: 0,
      },
      {
        nombre:
          "Colisiones Mas Robo Total O Parcial A Consecuencia De Robo Total (1)",
        sumaAsegurada: suma_asegurada,
        deducible: "20% Mínimo U$ 100.00",
        prima: prima_total,
      },
      {
        nombre: "Rotura De Vidrios",
        sumaAsegurada: 1125,
        deducible: "",
        prima: 0,
      },
      {
        nombre: "Desórdenes Públicos",
        sumaAsegurada: suma_asegurada,
        deducible: "20% Mínimo U$ 100.00",
        prima: 0,
      },
      {
        nombre: "Riesgos Catastróficos",
        sumaAsegurada: suma_asegurada,
        deducible: "20% Mínimo U$ 100.00",
        prima: 0,
      },
      {
        nombre: "Extensión Territorial",
        sumaAsegurada: null,
        sumaAseguradaLabel: "Incluida",
        deducible: "30% Mínimo U$ 100.00",
        prima: 0,
      },
      {
        nombre:
          "R. Civil obligatoria por muerte o lesiones causadas a una persona",
        sumaAsegurada: 2500,
        deducible: "",
        prima: 55,
      },
      {
        nombre:
          "R. Civil obligatoria por muerte o lesiones causadas a dos o mas personas",
        sumaAsegurada: 5000,
        deducible: "",
        prima: 0,
      },
      {
        nombre:
          "R. Civil obligatoria por daños materiales causados a terceras personas",
        sumaAsegurada: 2500,
        deducible: "",
        prima: 0,
      },
    ];

    let items = baseItems.slice();

    if (String(tipoCobertura).toLowerCase() === "exceso" && exceso > 0) {
      items = items.concat([
        {
          nombre:
            "R. Civil obligatoria por muerte o lesiones causadas a una persona (EXCESO)",
          sumaAsegurada: exceso,
          deducible: "",
          prima: extra_exceso,
        },
        {
          nombre:
            "R. Civil obligatoria por muerte o lesiones causadas a dos o mas personas (EXCESO)",
          sumaAsegurada: exceso * 2,
          deducible: "",
          prima: 0,
        },
        {
          nombre:
            "R. Civil obligatoria por daños materiales causados a terceras personas (EXCESO)",
          sumaAsegurada: exceso,
          deducible: "",
          prima: 0,
        },
      ]);
    }

    res.json({
      valor_nuevo,
      factor_conversion,
      suma_asegurada,
      prima_danos,
      derecho_emision,
      iva,
      soa,
      prima_total,
      excesoRC: exceso,
      extra_exceso,
      prima_total_con_exceso,
      items,
      totalPaso2: prima_total_con_exceso,
    });
  } catch (err) {
    console.error("Error en /auto/calculo:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────────
   Generar y descargar PDF (Paso 1 + Paso 2)
   POST /api/cotizaciones/auto/pdf
   body: { marca, modelo, anio, items:[...], total, clienteNombre? }
────────────────────────────────────────────────────────────────────────────── */
router.post("/auto/pdf", async (req, res) => {
  try {
    const {
      marca,
      modelo,
      anio,
      items = [],
      total = 0,
      clienteNombre = "",
      fecha = new Date().toLocaleDateString("es-NI"),
    } = req.body || {};

    if (!marca || !modelo || !anio) {
      return res
        .status(400)
        .json({ error: "Faltan datos: marca, modelo, anio" });
    }

    const html = buildPdfHtml({
      marca,
      modelo,
      anio,
      items,
      total,
      clienteNombre,
      fecha,
    });

    // ⬇️ Siempre a Buffer
    let pdfBuffer = await renderPdfFromHtml(html);
    if (!Buffer.isBuffer(pdfBuffer)) pdfBuffer = Buffer.from(pdfBuffer);

    // Diagnóstico útil
    console.log(
      "PDF size:",
      pdfBuffer.length,
      "header:",
      pdfBuffer.slice(0, 5).toString()
    );

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).json({ error: "PDF vacío o inválido" });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cotizacion-auto-${marca}-${modelo}-${anio}.pdf"`
    );
    res.setHeader("Content-Length", String(pdfBuffer.length));
    return res.end(pdfBuffer); // 👈 binario “duro”
  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: "No se pudo generar el PDF" });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Enviar correo (Mailgun) — adjunta PDF si attachPdf = true
// POST /api/cotizaciones/enviar-mail
// body:
// { to, subject, datosVehiculo:{marca,modelo,anio}, cliente:{...}, calculo:{items, prima_total_con_exceso}, attachPdf?: true }
router.post("/enviar-mail", async (req, res) => {
  try {
    const { to, subject, datosVehiculo, cliente, calculo, attachPdf } =
      req.body || {};
    const recipients = normalizeRecipients(to);

    if (!recipients.length || !datosVehiculo || !cliente) {
      return res.status(400).json({
        error: "Faltan campos requeridos: to (válido), datosVehiculo, cliente",
      });
    }

    const titulo =
      subject ||
      `Cotización de Auto - ${datosVehiculo.marca} ${datosVehiculo.modelo} ${datosVehiculo.anio}`;

    // Fecha y nombre de cliente
    const fecha = new Date().toLocaleDateString("es-NI", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const clienteNombre =
      [cliente?.["Primer Nombre"], cliente?.["Primer Apellido"]]
        .filter(Boolean)
        .join(" ") ||
      cliente?.nombre ||
      "Cliente";

    // HTML del cuerpo del correo (tu versión cuidada)
    const itemsHtml = Array.isArray(calculo?.items)
      ? calculo.items
          .map(
            (it) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${it.nombre}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">
            ${
              it.sumaAseguradaLabel
                ? it.sumaAseguradaLabel
                : usd(it.sumaAsegurada)
            }
          </td>
          <td style="padding:8px;border:1px solid #e5e7eb">${
            it.deducible || ""
          }</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${usd(
            it.prima
          )}</td>
        </tr>`
          )
          .join("")
      : "";

    const html = `
  <div style="background:#f5f7fb;padding:24px 0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:18px 24px;background:#eaf2ff;border-bottom:1px solid #dbeafe;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="https://www.trustcorreduria.com/static/seguros/wp-content/uploads/2018/05/trust-logo-300px.png" alt="Trust Correduría de Seguros" style="display:block;height:46px;">
                    </td>
                    <td style="text-align:right;font-size:12px;line-height:1.5;vertical-align:middle;color:#1f2937;">
                      <div style="font-weight:700;color:#111827;">Trust Correduría de Seguros</div>
                      <div style="color:#374151;">Managua, Nicaragua</div>
                      <div style="color:#374151;">
                        Teléfono (505) 2251 0108 •
                        <a href="mailto:contacto@trustcorreduria.com" style="color:#1e40af;text-decoration:none;">contacto@trustcorreduria.com</a>
                      </div>
                      <div><a href="https://www.trustcorreduria.com" style="color:#1e40af;text-decoration:none;">www.trustcorreduria.com</a></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px 8px 24px;">
                <div style="font-size:14px;color:#6b7280;margin-bottom:4px;">Fecha: <strong>${fecha}</strong></div>
                <h2 style="margin:0 0 4px 0;font-size:18px;letter-spacing:.3px;">INDICATIVO DE COSTO Y COBERTURA</h2>
                <div style="font-size:14px;color:#374151;margin-top:2px;">Sr(a). <strong>${clienteNombre}</strong></div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 24px 16px 24px;">
                <table role="presentation" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                  <tr><td colspan="6" style="background:#f3f4f6;padding:10px 12px;font-weight:600;">Datos del Vehículo</td></tr>
                  <tr>
                    <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">MARCA</td>
                    <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${
                      datosVehiculo.marca || ""
                    }</td>
                    <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">MODELO</td>
                    <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${
                      datosVehiculo.modelo || ""
                    }</td>
                    <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">AÑO</td>
                    <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${
                      datosVehiculo.anio || ""
                    }</td>
                  </tr>
                </table>
              </td>
            </tr>

            ${
              Array.isArray(calculo?.items)
                ? `
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table role="presentation" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                  <thead>
                    <tr style="background:#f3f4f6">
                      <th align="left"  style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Detalle de Coberturas</th>
                      <th align="right" style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Suma Asegurada</th>
                      <th align="left"  style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Deducible</th>
                      <th align="right" style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Prima</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" align="right" style="padding:12px;border-top:1px solid #e5e7eb;"><b>Total a Pagar:</b></td>
                      <td align="right" style="padding:12px;border-top:1px solid #e5e7eb;"><b>${usd(
                        calculo?.prima_total_con_exceso ??
                          calculo?.prima_total ??
                          0
                      )}</b></td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>`
                : ``
            }

            <tr>
              <td style="padding:14px 24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
                Enviado automáticamente desde Trust Correduría. Este mensaje podría contener información confidencial.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
    // ───────────────────────────────────────────────────────────────────────────

    const form = new FormData();
    form.append(
      "from",
      `Trust Correduría de Seguros <info@trustcorreduria.com>`
    );
    recipients.forEach((rcpt) => form.append("to", rcpt));
    form.append("subject", titulo);
    form.append("html", html);

    // ⬇️ Adjuntar PDF si se solicita
    if (attachPdf) {
      const pdfHtml = buildPdfHtml({
        marca: datosVehiculo?.marca,
        modelo: datosVehiculo?.modelo,
        anio: datosVehiculo?.anio,
        items: calculo?.items || [],
        total: calculo?.prima_total_con_exceso ?? calculo?.prima_total ?? 0,
        clienteNombre,
        fecha,
      });
      const pdfBuffer = await renderPdfFromHtml(pdfHtml);
      form.append("attachment", pdfBuffer, {
        filename: `cotizacion-auto-${datosVehiculo?.marca}-${datosVehiculo?.modelo}-${datosVehiculo?.anio}.pdf`,
        contentType: "application/pdf",
      });
    }

    await axios.post(MAILGUN_URL, form, {
      auth: { username: "api", password: MAILGUN_API_KEY },
      headers: form.getHeaders(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(
      "Error enviando correo Mailgun:",
      err?.response?.data || err.message
    );
    res.status(500).json({ error: "No se pudo enviar el correo" });
  }
});

// POST /api/cotizaciones/auto/emitir-mail
router.post(
  "/auto/emitir-mail",
  // authenticateToken,  // <- habilítalo si quieres forzar sesión
  upload.fields([
    { name: "circulacionFile", maxCount: 1 },
    { name: "cedulaFile", maxCount: 1 },
    { name: "cartaCompraVentaFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1) Lee body estructurado
      const raw = req.body?.data;
      if (!raw) return res.status(400).json({ error: "Falta 'data' (JSON)" });

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return res.status(400).json({ error: "'data' no es JSON válido" });
      }

      const {
        // Paso 1
        marca,
        modelo,
        anio,
        // Paso 2
        tipoCobertura,
        excesoRC,
        items = [],
        totalPaso2 = 0,
        // Paso 3 (solo nombre/correo del usuario autenticado si ésa fue tu decisión)
        clienteNombre,
        clienteEmail,
        // Paso 4
        chasis,
        motor,
        color,
        placa,
        usoVehiculo,
        vigencia, // YYYY-MM-DD
        circulacionDueno, // "si" | "no"
        vehiculoDanado, // "si" | "no"
        descripcionDanios,
        cesionDerechos, // "si" | "no"
        entidadCesion, // string si aplica
        // Meta
        attachPdf = true,
        to = [], // destinatarios extra (ej: agente)
      } = payload;

      if (!marca || !modelo || !anio) {
        return res.status(400).json({ error: "Faltan marca/modelo/año" });
      }
      if (!clienteEmail) {
        return res.status(400).json({ error: "Falta correo del cliente" });
      }

      // 2) Construye HTML bonito (compacto y legible)
      const fecha = new Date().toLocaleDateString("es-NI", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const usd = (n) =>
        typeof n === "number"
          ? n.toLocaleString("es-NI", { style: "currency", currency: "USD" })
          : "";

      const itemsHtml = Array.isArray(items)
        ? items
            .map(
              (it) => `
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb">${
              it?.nombre ?? ""
            }</td>
            <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">
              ${
                it?.sumaAseguradaLabel ??
                (it?.sumaAsegurada != null
                  ? usd(Number(it.sumaAsegurada))
                  : "—")
              }
            </td>
            <td style="padding:8px;border:1px solid #e5e7eb">${
              it?.deducible ?? ""
            }</td>
            <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${usd(
              Number(it?.prima || 0)
            )}</td>
          </tr>`
            )
            .join("")
        : "";

      const html = `
  <div style="background:#f5f7fb;padding:24px 0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial;">
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr><td align="center">
        <table width="680" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:18px 24px;background:#eaf2ff;border-bottom:1px solid #dbeafe;">
              <table width="100%">
                <tr>
                  <td>
                    <img src="https://www.trustcorreduria.com/static/seguros/wp-content/uploads/2018/05/trust-logo-300px.png" alt="Trust" style="display:block;height:46px;">
                  </td>
                  <td style="text-align:right;font-size:12px;color:#1f2937;">
                    <div style="font-weight:700;color:#111827;">Trust Correduría de Seguros</div>
                    <div style="color:#374151;">Managua, Nicaragua</div>
                    <div style="color:#374151;">Tel. (505) 2251 0108 • <a href="mailto:contacto@trustcorreduria.com" style="color:#1e40af;text-decoration:none;">contacto@trustcorreduria.com</a></div>
                    <div><a href="https://www.trustcorreduria.com" style="color:#1e40af;text-decoration:none;">www.trustcorreduria.com</a></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <div style="font-size:14px;color:#6b7280;margin-bottom:4px;">Fecha: <strong>${fecha}</strong></div>
              <h2 style="margin:0 0 4px 0;font-size:18px;letter-spacing:.3px;">EMISIÓN DE PÓLIZA – AUTO</h2>
              <div style="font-size:14px;color:#374151;margin-top:2px;">Cliente: <strong>${
                clienteNombre ?? ""
              }</strong> &lt;${clienteEmail}&gt;</div>
            </td>
          </tr>

          <tr><td style="padding:8px 24px 16px 24px;">
            <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr><td colspan="6" style="background:#f3f4f6;padding:10px 12px;font-weight:600;">Datos del Vehículo</td></tr>
              <tr>
                <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">MARCA</td>
                <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${marca}</td>
                <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">MODELO</td>
                <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${modelo}</td>
                <td style="width:16.6%;padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">AÑO</td>
                <td style="width:16.6%;padding:10px 12px;border-top:1px solid #e5e7eb;">${anio}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">CHASIS</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  chasis ?? ""
                }</td>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">MOTOR</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  motor ?? ""
                }</td>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">COLOR</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  color ?? ""
                }</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">PLACA</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  placa ?? ""
                }</td>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">USO</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  usoVehiculo ?? ""
                }</td>
                <td style="padding:10px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">VIGENCIA</td>
                <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${
                  vigencia ?? ""
                }</td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:0 24px 16px 24px;">
            <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr><td colspan="2" style="background:#f3f4f6;padding:10px 12px;font-weight:600;">Condiciones</td></tr>
              <tr>
                <td style="width:40%;padding:8px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">Circulación a nombre del dueño actual</td>
                <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">${
                  circulacionDueno === "si" ? "Sí" : "No"
                }</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">Vehículo presenta daños</td>
                <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">${
                  vehiculoDanado === "si" ? "Sí" : "No"
                }${
        vehiculoDanado === "si" && descripcionDanios
          ? ` — ${descripcionDanios}`
          : ""
      }</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;">Cesión de derechos</td>
                <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">${
                  cesionDerechos === "si" ? `Sí — ${entidadCesion ?? ""}` : "No"
                }</td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:0 24px 16px 24px;">
            <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f3f4f6">
                  <th align="left"  style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Detalle de Coberturas</th>
                  <th align="right" style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Suma Asegurada</th>
                  <th align="left"  style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Deducible</th>
                  <th align="right" style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Prima</th>
                </tr>
              </thead>
              <tbody>
                ${
                  itemsHtml ||
                  `<tr><td colspan="4" style="padding:10px;text-align:center;color:#6b7280">Sin coberturas</td></tr>`
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" align="right" style="padding:12px;border-top:1px solid #e5e7eb;"><b>Total a Pagar:</b></td>
                  <td align="right" style="padding:12px;border-top:1px solid #e5e7eb;"><b>${usd(
                    Number(totalPaso2 || 0)
                  )}</b></td>
                </tr>
              </tfoot>
            </table>
          </td></tr>

          <tr>
            <td style="padding:14px 24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
              Alerta automática – Cliente emitió una póliza de auto.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </div>`;

      // 3) Prepara FormData Mailgun
      const recipients = normalizeRecipients([clienteEmail, ...to]);

      const form = new FormData();
      form.append("from", `Trust Correduría <no-reply@${MAILGUN_DOMAIN}>`);
      recipients.forEach((rcpt) => form.append("to", rcpt));
      form.append(
        "subject",
        `Emisión Póliza Auto - ${marca} ${modelo} ${anio}`
      );
      form.append("html", html);

      // 4) Adjuntos subidos (buffers en memoria)
      const cirFile = req.files?.circulacionFile?.[0];
      const cedFile = req.files?.cedulaFile?.[0];
      const cartaFile = req.files?.cartaCompraVentaFile?.[0];

      const pushAttach = (file) => {
        if (file?.buffer && file?.originalname) {
          form.append("attachment", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype || "application/octet-stream",
          });
        }
      };
      pushAttach(cirFile);
      pushAttach(cedFile);
      pushAttach(cartaFile);

      // 5) (Opcional) Adjuntar el PDF bonito
      if (attachPdf) {
        const pdfHtml = buildPdfHtml({
          marca,
          modelo,
          anio,
          items,
          total: totalPaso2,
          clienteNombre,
          fecha,
        });
        const pdfBuffer = await renderPdfFromHtml(pdfHtml);
        form.append("attachment", pdfBuffer, {
          filename: `cotizacion-${marca}-${modelo}-${anio}.pdf`,
          contentType: "application/pdf",
        });
      }

      // 6) Envío
      await axios.post(MAILGUN_URL, form, {
        auth: { username: "api", password: MAILGUN_API_KEY },
        headers: form.getHeaders(),
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error("Error emitir-mail:", err?.response?.data || err.message);
      return res.status(500).json({ error: "No se pudo enviar el correo" });
    }
  }
);

module.exports = router;
