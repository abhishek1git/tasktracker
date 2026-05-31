const Redis = require("ioredis");

let redis;

const getRedisClient = () => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    redis.on("connect", () => console.log("Redis connected"));
    redis.on("error", (err) => console.error("Redis error:", err.message));
  }
  return redis;
};

const cacheGet = async (key) => {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Cache GET error:", err.message);
    return null;
  }
};

const cacheSet = async (
  key,
  value,
  ttl = parseInt(process.env.CACHE_TTL) || 300,
) => {
  try {
    const client = getRedisClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error("Cache SET error:", err.message);
  }
};

const cacheDel = async (pattern) => {
  try {
    const client = getRedisClient();
    if (pattern.includes("*")) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } else {
      await client.del(pattern);
    }
  } catch (err) {
    console.error("Cache DEL error:", err.message);
  }
};

module.exports = { getRedisClient, cacheGet, cacheSet, cacheDel };
