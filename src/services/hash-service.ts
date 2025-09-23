import { generatePoptavkaHash, decodePoptavkaHash, PoptavkaHashData } from '@/utils/hash-generator';

export interface HashServiceResult {
  success: boolean;
  hash?: string;
  data?: PoptavkaHashData;
  error?: string;
}

class HashService {
  /**
   * Generate a reversible hash that contains the data itself
   */
  generateHash(data: PoptavkaHashData): string {
    return generatePoptavkaHash(data);
  }

  /**
   * Decode hash back to original data
   */
  decodeHash(hash: string): PoptavkaHashData | null {
    return decodePoptavkaHash(hash);
  }

  /**
   * Create poptavka URL with hash
   */
  createPoptavkaUrl(hash: string, baseUrl: string = ''): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/poptavka?hash=${hash}`;
  }

  /**
   * Navigate to poptavka with hash (client-side only)
   */
  async navigateToPoptavka(data: PoptavkaHashData, router: { push: (path: string) => void }): Promise<void> {
    try {
      // Generate reversible hash that contains the data
      const hash = this.generateHash(data);
      router.push(`/poptavka?hash=${hash}`);
    } catch {
      router.push('/poptavka');
    }
  }
}

// Export singleton instance
export const hashService = new HashService();