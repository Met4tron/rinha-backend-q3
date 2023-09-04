import * as HyperExpress from 'hyper-express';
import { randomUUID } from 'node:crypto';
import { cpus } from 'node:os';
import process from 'node:process';
import cluster from 'node:cluster';
import { createPersonSchema, findPersonByIdSchema, findPersonByQuery } from './schemas';
import {
  addPerson,
  getCountPerson, getPerson,
  getPersonFullText,
  Person
} from './db';
import Validator from 'fastest-validator';
import {
  connectNats,
  getApelidoFromCache,
  getRequestCache, getTermFromCache,
  publishMessage
} from './nats';

const numCPUs = cpus().length

process.env.UV_THREADPOOL_SIZE = "" + numCPUs;

const v = new Validator({ haltOnFirstError: true });

const compiledSchemas = {
  createPersonSchema: v.compile(createPersonSchema),
  findPersonByIdSchema: v.compile(findPersonByIdSchema),
  findPersonByQuery: v.compile(findPersonByQuery)
}

const server = new HyperExpress.Server({ trust_proxy: true });

server.post('/pessoas', async (request, response) => {
  try {
    const body = await request.json();

    if(Array.isArray(compiledSchemas.createPersonSchema(body))) {
      return response.status(400).json({});
    }

    if (!+new Date(body.nascimento)) {
      return response.status(400).json({ message: 'Data de nascimento inválida' });
    }

    if (getApelidoFromCache(body.apelido)) {
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

    publishMessage('person.create', newPerson);

    await addPerson(newPerson);

    return response
      .status(201)
      .header('Location', `/pessoas/${personId}`)
      .json({ message: 'User created' });
  } catch (e) {
    return response.status(500)
  }
});

server.get('/pessoas/:id', async (request, response) => {
  try {
    if (!compiledSchemas.findPersonByIdSchema(request.path_parameters)) {
      return response.status(400).json({});
    }

    const personId = request.path_parameters.id;

    const cachePerson = getRequestCache(personId)

    if (cachePerson) {
      console.log("Cache - ID - NATS")
      console.log(cachePerson)
      return response.status(200)
        .header('cache-control', 'public, max-age=604800, immutable')
        .json(cachePerson);
    }

    const personDb = await getPerson(personId);

    if (personDb?.[0]) {
      return response
        .status(200)
        .header('cache-control', 'public, max-age=604800, immutable')
        .json(personDb?.[0]);
    }

    return response.status(404);
  } catch (err) {
    console.log(err);
    return response.status(500)
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

    const peopleCache = getTermFromCache(qp.t);

    if (peopleCache) {
      console.log("Cache - Term - NATS")
      return response.status(200).json(peopleCache);
    }

    const people = await getPersonFullText(qp.t.toLowerCase());

    publishMessage("person.search", {
      term: qp.t.toLowerCase(),
      data: people,
    })

    return response.status(200).json(people);
  } catch (e) {
    console.log("Error in search by term");
    return response
      .status(500)
  }
});

server.get('/contagem-pessoas', async (request, response) => {
  try {
    const countPerson = await getCountPerson();
    return response.status(200).json({ count: countPerson[0].count });
  } catch (e) {
    return response.status(500).json({});
  }
});

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  connectNats()
    .then(_ => server.listen(80))
    .then((socket) => console.log('Webserver started on port 3000'))
    .then(_ => {
      console.log(`Worker ${process.pid} started`);
    })
    .catch((error) => {
      console.log(error);
      console.log('Failed to start webserver on port 80');
    });
}