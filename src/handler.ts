import * as HyperExpress from 'hyper-express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import {
  getApelidoFromCache,
  getRequestCache,
  setApelidoCache, setRequestCache
} from './redis';
import {createPersonSchema, findPersonByIdSchema, findPersonByQuery} from './schemas';
import {
  addPerson,
  getCountPerson, getPerson,
  getPersonFullText,
  Person
} from './db';
import Validator from 'fastest-validator';
import {PostgresError} from 'postgres';

const v = new Validator({ haltOnFirstError: true });

const compiledSchemas = {
  createPersonSchema: v.compile(createPersonSchema),
  findPersonByIdSchema: v.compile(findPersonByIdSchema),
  findPersonByQuery: v.compile(findPersonByQuery)
}

const server = new HyperExpress.Server({ trust_proxy: true });

server.use(cors());

const personById = new Map();
const personByApelido = new Set()

server.post('/pessoas', async (request, response) => {
  try {
    const body = await request.json();

    if(Array.isArray(compiledSchemas.createPersonSchema(body))) {
      return response.status(400).json({});
    }

    if (!+new Date(body.nascimento)) {
      return response.status(400).json({ message: 'Data de nascimento inválida' });
    }

    if (personByApelido.has(body.apelido)) {
      return response
        .status(422)
        .json({ message: 'Invalid user' });
    }

    const hasApelido = await getApelidoFromCache(body.apelido);

    if (hasApelido) {
      return response
        .status(422)
        .json({ message: 'Invalid user' });
    }

    const personId = randomUUID();

    const newPerson: Person = {
      id: personId,
      nome: body.nome,
      apelido: body.apelido,
      nascimento: body.nascimento,
      stack: body?.stack?.join(' ') ?? null
    };

    try {
      await addPerson(newPerson)
    } catch (e) {
      if (e instanceof PostgresError && e.code == '23505') {
        return response
          .status(422)
          .json({ message: 'Invalid user' });
      }

      return response.status(500).json(e);
    }

    await Promise.all([
      await setApelidoCache(newPerson.apelido),
      await setRequestCache(`pessoas:${newPerson.id}`, JSON.stringify(newPerson)),
    ]);

    personByApelido.add(newPerson.apelido);
    personById.set(newPerson.id, newPerson);

    return response
      .status(201)
      .header('Location', `/pessoas/${personId}`)
      .json({ message: 'User created' });
  } catch (e) {
    return response.status(500).json(e);
  }
});

server.get('/pessoas/:id', async (request, response) => {
  try {
    if (!compiledSchemas.findPersonByIdSchema(request.path_parameters)) {
      return response.status(400).json({});
    }

    const personId = request.path_parameters.id;

    if (personById.has(personId)) {
      return response.status(200)
        .header('cache-control', 'public, max-age=604800, immutable')
        .json(personById.get(personById));
    }

    const personDb = await getPerson(personId);

    if (personDb?.[0]) {
      return response
        .status(200)
        .header('cache-control', 'public, max-age=604800, immutable')
        .json(personDb?.[0]);
    }

    const cachedReq = await getRequestCache(`pessoas:${personId}`);

    if (cachedReq) {
      return response
        .status(200)
        .header('cache-control', 'public, max-age=604800, immutable')
        .json(JSON.parse(cachedReq));
    }

    return response.status(404).json({ message: 'Person not found' });
  } catch (err) {
    return response.status(500).json(err);
  }
});

server.get('/pessoas', async (request, response) => {
  try {
    const qp = request.query_parameters;

    if (!compiledSchemas.findPersonByQuery(qp)) {
      return response.status(400).json({ });
    }

    if (!qp.t || !qp.t.length) {
      return response.status(400).json({ });
    }

    const persons = await getPersonFullText(qp.t.toLowerCase());

    return response.status(200).json(persons);
  } catch (e) {
    return response
      .status(500)
      .json({ message: 'Error in search user with terms' });
  }
});

server.get('/contagem-pessoas', async (request, response) => {
  try {
    const countPerson = await getCountPerson();
    console.log(countPerson[0])
    return response.status(200).json({ count: countPerson[0].count });
  } catch (e) {
    console.log(e)
    return response.status(500).json({});
  }
});

server
  .listen(80)
  .then((socket) => console.log('Webserver started on port 3000'))
  .catch((error) => console.log('Failed to start webserver on port 80'));
