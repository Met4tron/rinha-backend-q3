import postgres from 'postgres'

const sql = postgres({
  database: 'rinhadb',
  password: '1234',
  host: 'database',
  user: 'root',
  max: 200,
  idle_timeout: 0,
  connect_timeout: 10000,
})

export type Person = {
  id: string;
  apelido: string;
  nome: string;
  nascimento: string;
  stack?: string | undefined;
}

export const addPerson = async (person: Person) => sql`INSERT INTO public.people ${sql(person)} ON CONFLICT (apelido) DO NOTHING`
export const getPerson = async (id: string) => sql`SELECT * FROM public.people WHERE id = ${id} LIMIT 1`;
export const getCountPerson = async () => sql`SELECT count(1) from public.people`
export const getPersonFullText = async (textToSearch: string) => sql`SELECT id, nome, apelido, nascimento, stack FROM public.people WHERE BUSCA_TRGM ILIKE ${'%' + sql(textToSearch) + '%'} LIMIT 50`

