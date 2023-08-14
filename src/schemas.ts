import { z } from 'zod'

export const personSchema = z.object({
  apelido: z.string().max(32),
  nome: z.string().max(32),
  nascimento: z.string().regex(new RegExp(/^\d{4}-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])$/)),
  stack: z.array(z.string().max(32)).optional().transform(val => val?.join('-') ?? undefined)
});

export const getPersonSchema = z.object({
  id: z.string().uuid(),
}).transform(val => val.id)
