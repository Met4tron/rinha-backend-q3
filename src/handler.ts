import * as HyperExpress from 'hyper-express';
import {randomUUID} from 'node:crypto';
import cors from 'cors';
import {poolRedis} from './redis';
import {getPersonSchema, personSchema} from './schemas';
import {addPerson, checkApelido, getCountPerson, getPerson, getPersonFullText, Person} from './db';
import {ZodError} from 'zod';

const server = new HyperExpress.Server({trust_proxy: true});

const makeRedisKey = (key: string) => `person-${key}`;

server.use(cors());

server.post('/pessoas', async (request, response) => {

  try {
    const body = await request.json();
    const bodyParsed = await personSchema.parseAsync(body);

    const hasUser = await checkApelido(bodyParsed.apelido);

    if (hasUser.length) {
      return response.status(422).json({message: 'Invalid person'});
    }

    const personId = randomUUID();

    const newPerson: Person = {
      id: personId,
      nome: bodyParsed.nome,
      apelido: bodyParsed.apelido,
      nascimento: bodyParsed.nascimento,
      stack: bodyParsed?.stack ?? ''
    };

    await addPerson(newPerson);

    const redisConn = await poolRedis.acquire();

    redisConn.set(makeRedisKey(personId), JSON.stringify(newPerson));

    await poolRedis.release(redisConn);

    return response.status(201)
      .header('Location', `/pessoas/${personId}`)
      .json({message: 'User created'});

  } catch (e) {
    if (e instanceof ZodError) {
      return response.status(400).json(e.issues);
    }

    return response.status(500).json(e);
  }
});

server.get('/pessoas/:id', async (request, response) => {
  try {
    const personId = getPersonSchema.parse(request.path_parameters);

    const redisConn = await poolRedis.acquire();

    const personFromRedis = await redisConn.get(makeRedisKey(personId));

    if (personFromRedis) {
      await poolRedis.release(redisConn);

      return response.status(200).json(personFromRedis);
    }

    const personDb = await getPerson(personId);

    if (personDb?.[0]) {
      return response.status(200).json(personDb[0]);
    }

    return response.status(404).json(personFromRedis);
  } catch (err) {
    if (err instanceof ZodError) {
      return response.status(400).json(err.issues);
    }

    return response.status(500).json(err);
  }
});

server.get('/pessoas', async (request, response) => {
  try {
    const searchTerm = request.query_parameters?.t ?? null;

    if (!searchTerm || searchTerm == '') {
      return response.status(400).json({message: 'Invalid term'});
    }

    const sanitizeSearch = searchTerm.replaceAll(' ', '*');

    const persons = await getPersonFullText(sanitizeSearch);

    return response.status(200).json(persons);
  } catch (e) {
    return response.status(500).json({message: 'Error in search user with terms'});
  }
});

server.get('/contagem-pessoas', async (request, response) => {
  try {
    const countPerson = await getCountPerson();

    return response.status(200).json({count: countPerson[0].count});
  } catch (e) {
    return response.status(500).json({});
  }
});

server.listen(80)
  .then((socket) => console.log('Webserver started on port 3000'))
  .catch((error) => console.log('Failed to start webserver on port 80'));