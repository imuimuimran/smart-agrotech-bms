import Joi from 'joi';

export const createPOSchema = Joi.object({
  supplierId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
    .messages({ 'string.pattern.base': 'Invalid Supplier ID format' }),
  expectedDeliveryDate: Joi.date().greater('now').optional(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      orderedQuantity: Joi.number().integer().min(1).required(),
      expectedUnitCost: Joi.number().positive().required(),
      discount: Joi.number().min(0).default(0),
      tax: Joi.number().min(0).default(0)
    })
  ).min(1).required(),
  shippingCost: Joi.number().min(0).default(0),
  otherCharges: Joi.number().min(0).default(0),
  notes: Joi.string().allow('').optional()
});

export const updatePODraftSchema = Joi.object({
  expectedDeliveryDate: Joi.date().greater('now').optional(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      orderedQuantity: Joi.number().integer().min(1).required(),
      expectedUnitCost: Joi.number().positive().required(),
      discount: Joi.number().min(0).default(0),
      tax: Joi.number().min(0).default(0)
    })
  ).min(1).optional(),
  shippingCost: Joi.number().min(0).optional(),
  otherCharges: Joi.number().min(0).optional(),
  notes: Joi.string().allow('').optional()
});
