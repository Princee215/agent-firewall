import { Redis } from "@upstash/redis";
 
let _redis = null;
 
// Returns a Redis client, or null if env vars aren't set.
// Null means features degrade gracefully — the app still works.
export function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}