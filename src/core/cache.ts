import crypto from 'node:crypto';
import fs from 'node:fs';
import { paths } from './paths.js';

export interface CacheEntry {
  content: string;
  timestamp: string;
  diffHash: string;
}

export type CacheAction = 'commit' | 'pr' | 'review';

export interface ProjectCache {
  commit?: CacheEntry;
  pr?: CacheEntry;
  review?: CacheEntry;
}

export class CacheManager {
  private getCacheFile(): string {
    return paths.getCachePath();
  }

  private getStore(): ProjectCache {
    const cacheFile = this.getCacheFile();
    if (fs.existsSync(cacheFile)) {
      try {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveStore(store: ProjectCache) {
    const cacheFile = this.getCacheFile();
    fs.writeFileSync(cacheFile, JSON.stringify(store, null, 2));
  }

  generateDiffHash(diff: string): string {
    return crypto.createHash('md5').update(diff).digest('hex');
  }

  get(action: CacheAction): CacheEntry | null {
    const store = this.getStore();
    return store[action] || null;
  }

  set(action: CacheAction, entry: CacheEntry) {
    const store = this.getStore();
    store[action] = entry;
    this.saveStore(store);
  }

  clear(action?: CacheAction) {
    if (action) {
      const store = this.getStore();
      delete store[action];
      this.saveStore(store);
    } else {
      this.saveStore({});
    }
  }
}

export const cacheManager = new CacheManager();
