import Redis from 'ioredis';
import * as pool from 'generic-pool';

export const poolRedis = pool.createPool({
  async create(): Promise<Redis> {
    const redis = new Redis({ enableAutoPipelining: true, host: 'redis'  });

    redis.on('error', () => {
      throw new Error('redis closed connection')
    })

    redis.on('close', () => {
      throw new Error('redis closed connection')
    })

    return redis;
  },

  async destroy(client: Redis): Promise<void> {
    await client.quit();
  }
}, { max: 50, min: 5 })


export const getApelidoFromCache = async (apelido: string) => {
  const pool = await poolRedis.acquire();
  const hasNickname = await pool.exists(`nickname:${apelido}`);
  await poolRedis.release(pool);

  return hasNickname;
}

export const setApelidoCache = async(apelido: string) => {
  const pool = await poolRedis.acquire();
  await pool.set(`nickname:${apelido}`, 1);
  await poolRedis.release(pool);
}

export const setRequestCache = async(request: string, body: string) => {
  const pool = await poolRedis.acquire();
  await pool.set(request, body);
  await poolRedis.release(pool);
}

export const getRequestCache = async(request: string) => {
  const pool = await poolRedis.acquire();
  const reqCache = await pool.get(request);
  await poolRedis.release(pool);

  return reqCache;
}
