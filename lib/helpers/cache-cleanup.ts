// Win Room v2.0 - Cache Cleanup Helper
import { query } from '../db/connection';

/**
 * Clean up expired cache entries from cache_kv table
 * This should be called periodically (e.g., daily) to prevent table bloat
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM wr.cache_kv
       WHERE ttl_seconds IS NOT NULL
         AND updated_at + (ttl_seconds || ' seconds')::interval < NOW()
       RETURNING key`
    );

    const deletedCount = result.length;
    if (deletedCount > 0) {
      console.log(`[CacheCleanup] Cleaned up ${deletedCount} expired cache entries`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[CacheCleanup] Error cleaning up cache:', error);
    return 0;
  }
}
