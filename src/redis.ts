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
}, { max: 10, min: 5 })