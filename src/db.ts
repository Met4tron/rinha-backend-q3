import postgres from 'postgres'

const sql = postgres({
  database: 'rinhadb',
  password: '1234',
  host: 'database',
  user: 'root',
  max: 100,
})

export type Person = {
  id: string;
  apelido: string;
  nome: string;
  nascimento: string;
  stack?: string | undefined;
}

export const addPerson = async (person: Person) => sql`INSERT INTO public.people ${sql(person)} ON CONFLICT (apelido) DO NOTHING`
export const getPerson = async (id: string) => sql`SELECT * FROM public.people WHERE id = ${id}`;
export const getCountPerson = async () => sql`SELECT count(*) from public.people`
export const checkApelido = async (apelido: string) => {
  const result = await sql`SELECT 1 from people WHERE apelido ilike ${apelido}`;

  return result.length;
}
export const getPersonFullText = async (textToSearch: string) => sql`SELECT id, nome, apelido, nascimento, stack FROM public.people WHERE apelido ILIKE ${'%' + sql(textToSearch) + '%'} AND nome ILIKE ${'%' + sql(textToSearch) + '%'} AND stack ILIKE ${'%' + sql(textToSearch) + '%'} LIMIT 50`

export default sql
