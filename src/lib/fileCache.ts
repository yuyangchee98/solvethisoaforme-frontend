/**
 * Simple in-memory file cache for blob URLs.
 * Caches uploaded files for instant display when the agent reads them.
 */

// Module-level cache - survives component remounts
const cache = new Map<string, string>();

/**
 * Cache a file and return its blob URL.
 * If a file was previously cached at this path, the old URL is revoked.
 */
export function cacheFile(relativePath: string, file: File): string {
  const existing = cache.get(relativePath);
  if (existing) {
    URL.revokeObjectURL(existing);
  }

  const blobUrl = URL.createObjectURL(file);
  cache.set(relativePath, blobUrl);
  return blobUrl;
}

/**
 * Get a cached blob URL for a file path.
 */
export function getCachedUrl(relativePath: string): string | undefined {
  return cache.get(relativePath);
}

/**
 * Clear all cached URLs and revoke their blob URLs.
 */
export function clearCache(): void {
  cache.forEach((url) => URL.revokeObjectURL(url));
  cache.clear();
}
