// middleware/validation.js
const Joi = require("joi")

// Año actual (permitimos modelos del próximo año también)
const CURRENT_YEAR = new Date().getFullYear()

/**
 * Valida y sanea la fuente indicada del request (body, query, params).
 * - abortEarly: false -> reporta todos los errores
 * - stripUnknown: true -> elimina claves no permitidas
 * - convert: true -> intenta convertir tipos (p.ej., "123" -> 123)
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const input = req[source] || {}
    const { value, error } = schema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })
    if (error) {
      return res.status(400).json({
        error: "Datos de entrada no válidos",
        details: error.details.map((d) => d.message),
      })
    }
    // Sobrescribe con el payload saneado
    req[source] = value
    next()
  }
}

// Compat: mantiene el nombre previo para validar body
const validateRequest = (schema) => validate(schema, "body")
const validateQuery = (schema) => validate(schema, "query")
const validateParams = (schema) => validate(schema, "params")

// ------------------------------
// Esquemas de validación (Joi)
// ------------------------------
const schemas = {
  // Auth
  login: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(6).required(),
  }),

  register: Joi.object({
    primer_nombre: Joi.string().min(2).max(50).required(),
    segundo_nombre: Joi.string().max(50).optional(),
    primer_apellido: Joi.string().min(2).max(50).required(),
    segundo_apellido: Joi.string().max(50).optional(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(6).required(),
    telefono: Joi.string().allow("").optional(),
    celular: Joi.string().allow("").optional(),
    identificacion: Joi.string().allow("").optional(),
    departamento: Joi.string().allow("").optional(),
    municipio: Joi.string().allow("").optional(),
    direccion: Joi.string().allow("").optional(),
  }),

  // Cambio de contraseña (propio usuario)
  changePassword: Joi.object({
    currentPassword: Joi.string().min(6).required(),
    newPassword: Joi.string().min(8).required(),
  }),

  // Cotización de Auto (payload de creación si se usara)
  cotizacionAuto: Joi.object({
    marca: Joi.string().required(),
    modelo: Joi.string().required(),
    año: Joi.number().integer().min(1990).max(CURRENT_YEAR + 1).required(),
    tipoCobertura: Joi.string().valid("amplia", "exceso").required(),
    excesoRC: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    primerNombre: Joi.string().required(),
    primerApellido: Joi.string().required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    telefono: Joi.string().required(),
    identificacion: Joi.string().required(),
    departamento: Joi.string().required(),
    municipio: Joi.string().required(),
    direccion: Joi.string().required(),
    formaPago: Joi.string().valid("debito", "deposito").required(),
    aceptaTerminos: Joi.boolean().valid(true).required(),
  }),

  // Siniestros
  siniestro: Joi.object({
    seguro_id: Joi.number().integer().required(),
    fecha_incidente: Joi.date().required(),
    lugar_incidente: Joi.string().required(),
    descripcion: Joi.string().min(10).required(),
    monto_reclamado: Joi.number().positive().optional(),
  }),

  // Recomendados
  recomendado: Joi.object({
    nombre_completo: Joi.string().min(5).required(),
    telefono: Joi.string().required(),
    email: Joi.string().email({ tlds: { allow: false } }).allow("").optional(),
    tipo_interes: Joi.string().valid("auto", "sepelio", "accidentes", "todos").optional(),
    comentarios: Joi.string().allow("").optional(),
  }),

  // Envío de correo de cotización (Mailgun)
  enviarMailCotizacion: Joi.object({
    to: Joi.alternatives()
      .try(
        Joi.string().email({ tlds: { allow: false } }),
        Joi.array().items(Joi.string().email({ tlds: { allow: false } })).min(1)
      )
      .required(),
    subject: Joi.string().max(150).allow("").optional(),
    datosVehiculo: Joi.object({
      marca: Joi.string().required(),
      modelo: Joi.string().required(),
      anio: Joi.alternatives().try(Joi.number().integer(), Joi.string()).required(),
    }).required(),
    // Permitimos cualquier campo del cliente (el front puede variar)
    cliente: Joi.object().pattern(Joi.string(), Joi.any()).required(),
    calculo: Joi.object({
      valor_nuevo: Joi.number().optional(),
      factor_conversion: Joi.number().optional(),
      suma_asegurada: Joi.number().optional(),
      prima_danos: Joi.number().optional(),
      derecho_emision: Joi.number().optional(),
      iva: Joi.number().optional(),
      soa: Joi.number().optional(),
      prima_total: Joi.number().optional(),
      prima_total_con_exceso: Joi.number().optional(),
      items: Joi.array().items(
        Joi.object({
          nombre: Joi.string().required(),
          sumaAsegurada: Joi.alternatives().try(Joi.number(), Joi.allow(null)).optional(),
          sumaAseguradaLabel: Joi.string().allow("").optional(),
          deducible: Joi.string().allow("").optional(),
          prima: Joi.number().required(),
        })
      ).optional(),
      totalPaso2: Joi.number().optional(),
    }).optional(),
  }),

  // (Para futuro CRUD admin de usuarios)
  usuarioAdminCreate: Joi.object({
    primer_nombre: Joi.string().min(2).max(50).required(),
    segundo_nombre: Joi.string().max(50).allow("").optional(),
    primer_apellido: Joi.string().min(2).max(50).required(),
    segundo_apellido: Joi.string().max(50).allow("").optional(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).required(),
    telefono: Joi.string().allow("").optional(),
    celular: Joi.string().allow("").optional(),
    identificacion: Joi.string().allow("").optional(),
    departamento: Joi.string().allow("").optional(),
    municipio: Joi.string().allow("").optional(),
    direccion: Joi.string().allow("").optional(),
    rol: Joi.string().valid("administrador", "colaborador").required(),
    activo: Joi.boolean().default(true),
  }),

  usuarioAdminUpdate: Joi.object({
    primer_nombre: Joi.string().min(2).max(50).optional(),
    segundo_nombre: Joi.string().max(50).allow("").optional(),
    primer_apellido: Joi.string().min(2).max(50).optional(),
    segundo_apellido: Joi.string().max(50).allow("").optional(),
    telefono: Joi.string().allow("").optional(),
    celular: Joi.string().allow("").optional(),
    identificacion: Joi.string().allow("").optional(),
    departamento: Joi.string().allow("").optional(),
    municipio: Joi.string().allow("").optional(),
    direccion: Joi.string().allow("").optional(),
    rol: Joi.string().valid("administrador", "colaborador").optional(),
    activo: Joi.boolean().optional(),
    // password solo en endpoint dedicado, no aquí
  }),
}

module.exports = {
  validateRequest,
  validateQuery,
  validateParams,
  schemas,
}
