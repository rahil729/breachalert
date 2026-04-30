const redis = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS) || 86400; // 24 hours default

let client = null;
let isConnected = false;
let redisErrorLogged = false;

/**
 * Connect to Redis server
 * Falls back to in-memory cache if Redis is unavailable
 */
async function connectRedis() {
  try {
    client = redis.createClient({
      url: REDIS_URL,
      legacyMode: false,
    });

    client.on("error", (err) => {
      if (!isConnected && !redisErrorLogged) {
        console.warn("Redis unavailable, using in-memory cache");
        redisErrorLogged = true;
      }
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("Redis Connected");
      isConnected = true;
      redisErrorLogged = false;
    });

    await client.connect();
    return true;
  } catch (err) {
    console.warn("Redis connection failed, using in-memory fallback:", err.message);
    isConnected = false;
    return false;
  }
}

/**
 * Get cached value for a key
 * @param {string} key - Cache key
 * @returns {Promise<object|null>} - Cached data or null
 */
async function getCache(key) {
  if (!isConnected || !client) {
    return getMemoryCache(key);
  }

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis get error:", err.message);
    return null;
  }
}

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {object} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 */
async function setCache(key, value, ttl = CACHE_TTL_SECONDS) {
  if (!isConnected || !client) {
    return setMemoryCache(key, value, ttl);
  }

  try {
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error("Redis set error:", err.message);
  }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
async function deleteCache(key) {
  if (!isConnected || !client) {
    return deleteMemoryCache(key);
  }

  try {
    await client.del(key);
  } catch (err) {
    console.error("Redis delete error:", err.message);
  }
}

/**
 * Check if Redis is connected
 */
function isRedisConnected() {
  return isConnected;
}

// ========== IN-MEMORY FALLBACK ==========
const memoryCache = new Map();

function getMemoryCache(key) {
  const item = memoryCache.get(key);
  if (!item) return null;

  if (item.expires && item.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return item.data;
}

function setMemoryCache(key, value, ttlSeconds) {
  memoryCache.set(key, {
    data: value,
    expires: Date.now() + (ttlSeconds * 1000),
  });
}

function deleteMemoryCache(key) {
  memoryCache.delete(key);
}

// Cleanup old memory cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expires && item.expires < now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Check every minute

module.exports = {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  isRedisConnected,
};
