import { body } from 'express-validator';

export const createOccurrenceValidator = [
  body('tipo')
    .isIn([
      'RISCO', 'ALAGAMENTO', 'TRANSITO', 'INCENDIO', 
      'QUEDA_ARVORE', 'ACIDENTE', 'RESGATE', 'VAZAMENTO', 'OUTROS'
    ])
    .withMessage('Tipo de ocorrência inválido'),
  
  body('local')
    .trim()
    .notEmpty()
    .withMessage('O local (nome/referência) é obrigatório'),

  body('endereco')
    .trim()
    .notEmpty()
    .withMessage('O endereço completo é obrigatório'),

  // Validação condicional: Se não mandar lat/long, o endereço será usado pelo geocoder.
  // Mas se mandar, tem que ser número.
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude inválida'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude inválida'),
    
  body('prioridade')
    .optional()
    .isIn(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'])
    .withMessage('Prioridade inválida')
];

export const updateOccurrenceValidator = [
  body('status')
    .optional()
    .isIn(['NOVO', 'EM_ANALISE', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO'])
    .withMessage('Status inválido'),
    
  body('prioridade')
    .optional()
    .isIn(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'])
    .withMessage('Prioridade inválida')
];