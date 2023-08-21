import Validator from 'fastest-validator';

const v = new Validator({ haltOnFirstError: true,  useNewCustomCheckerFunction: true, // using new version
  messages: {
    customDate: "data invalida ai meu parceiro"
  } });

export const createPersonSchema = {
  apelido: {
    type: 'string', max: 32, min: 1
  },
  nome: {
    type: 'string', min: 1, max: 100
  },
  nascimento: {
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
  },
  stack: {
    type: 'array',
    items: {
      type: 'string',
      max: 32,
      min: 1,
      $$strict: true
    },
    $$strict: true,
    min: 1,
    optional: true
  },
  $$strict: true
}

export const findPersonByIdSchema = {
  id: {
    type: 'uuid',
  },
  $$strict: true

}

export const findPersonByQuery = {
  t: {
    type: 'string',
    min: 1,
  },
  $$strict: true
}