import postgres from 'postgres'

const sql = postgres({
  database: 'rinhadb',
  password: '1234',
  host: 'database',
  user: 'root',
  max: 20,
})

export type Person = {
  id: string;
  apelido: string;
  nome: string;
  nascimento: string;
  stack?: string | undefined;
}

export const addPerson = async (person: Person) => sql`INSERT INTO person ${sql(person, 'id', 'apelido', 'nome', 'nascimento', 'stack')}`
export const getPerson = async (id: string) => sql `SELECT * FROM person WHERE id = ${id}`;
export const getPersonFullText = async (textToSearch: string) => sql`SELECT * FROM person P WHERE TO_TSQUERY('BUSCA', ${textToSearch}) @@ BUSCA LIMIT 50;`
export const getCountPerson = async () => sql`SELECT COUNT(*) from person`
export const checkApelido = async (apelido: string) => sql`SELECT 1 from person WHERE apelido ilike ${apelido}`

export default sql