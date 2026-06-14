// src/app/api/log/route.js
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

const LOG_KEY = "af:log";

export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ entries: [], persisted: false });
  try {
    const raw = await redis.lrange(LOG_KEY, 0, 49);
    const entries = raw.map((e) => (typeof e === "string" ? JSON.parse(e) : e));
    return NextResponse.json({ entries, persisted: true });
  } catch {
    return NextResponse.json({ entries: [], persisted: false });
  }
}

// Lets you wipe the log before recording the demo video.
export async function DELETE() {
  const redis = getRedis();
  if (redis) { try { await redis.del(LOG_KEY); } catch {} }
  return NextResponse.json({ ok: true });
}