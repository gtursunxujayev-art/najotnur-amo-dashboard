// lib/callsCache.ts - Smart caching layer for calls data
// Returns cached data instantly, refreshes in background if stale

export type CachedCallsData = {
  timestamp: number;
  data: any[];
};

class CallsCacheManager {
  private cache: Map<string, CachedCallsData> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  set(key: string, data: any[]): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
    });
    console.log(`[CallsCache] Cached ${data.length} items for key "${key}"`);
  }

  get(key: string): any[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const isStale = age > this.CACHE_TTL_MS;

    if (isStale) {
      console.log(`[CallsCache] Cache for "${key}" is stale (${Math.round(age / 1000 / 60)} min old), will refresh`);
      return null; // Return null to trigger refresh
    }

    console.log(`[CallsCache] Returning cached ${cached.data.length} items for key "${key}" (${Math.round(age / 1000)} sec old)`);
    return cached.data;
  }

  isStale(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > this.CACHE_TTL_MS;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      console.log(`[CallsCache] Cleared cache for "${key}"`);
    } else {
      this.cache.clear();
      console.log(`[CallsCache] Cleared all caches`);
    }
  }
}

export const callsCache = new CallsCacheManager();
