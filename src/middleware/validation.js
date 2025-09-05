const Joi = require("joi")

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: "Datos de entrada no válidos",
        details: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// Esquemas de validación
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  register: Joi.object({
    primer_nombre: Joi.string().min(2).max(50).required(),
    segundo_nombre: Joi.string().max(50).optional(),
    primer_apellido: Joi.string().min(2).max(50).required(),
    segundo_apellido: Joi.string().max(50).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    telefono: Joi.string().optional(),
    celular: Joi.string().optional(),
    identificacion: Joi.string().optional(),
    departamento: Joi.string().optional(),
    municipio: Joi.string().optional(),
    direccion: Joi.string().optional(),
  }),

  cotizacionAuto: Joi.object({
    marca: Joi.string().required(),
    modelo: Joi.string().required(),
    año: Joi.number().integer().min(1990).max(2024).required(),
    tipoCobertura: Joi.string().valid("amplia", "exceso").required(),
    excesoRC: Joi.string().optional(),
    primerNombre: Joi.string().required(),
    primerApellido: Joi.string().required(),
    email: Joi.string().email().required(),
    telefono: Joi.string().required(),
    identificacion: Joi.string().required(),
    departamento: Joi.string().required(),
    municipio: Joi.string().required(),
    direccion: Joi.string().required(),
    formaPago: Joi.string().valid("debito", "deposito").required(),
    aceptaTerminos: Joi.boolean().valid(true).required(),
  }),

  siniestro: Joi.object({
    seguro_id: Joi.number().integer().required(),
    fecha_incidente: Joi.date().required(),
    lugar_incidente: Joi.string().required(),
    descripcion: Joi.string().min(10).required(),
    monto_reclamado: Joi.number().positive().optional(),
  }),

  recomendado: Joi.object({
    nombre_completo: Joi.string().min(5).required(),
    telefono: Joi.string().required(),
    email: Joi.string().email().optional(),
    tipo_interes: Joi.string().valid("auto", "sepelio", "accidentes", "todos").optional(),
    comentarios: Joi.string().optional(),
  }),
}

module.exports = { validateRequest, schemas }
