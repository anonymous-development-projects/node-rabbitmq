import * as Joi from 'joi';

export const ConsumeMsg = Joi.object()
  .keys({
    content: Joi.binary().min(2).required(),
    fields: Joi.object(),
    properties: Joi.object(),
  })
  .required();

export const RpcGetResultMsg = Joi.object()
  .keys({
    content: Joi.binary().min(2).required(),
    fields: Joi.object(),
    properties: Joi.object()
      .keys({
        correlationId: Joi.string().required(),
      })
      .required()
      .options({ stripUnknown: true }),
  })
  .required();

export const RpcConsumeMsg = Joi.object()
  .keys({
    content: Joi.binary().min(2).required(),
    fields: Joi.object(),
    properties: Joi.object()
      .keys({
        replyTo: Joi.string().required(),
        correlationId: Joi.string().required(),
      })
      .required()
      .options({ stripUnknown: true }),
  })
  .required();
