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
    console.log('Generating reversible hash for data:', data);
    return generatePoptavkaHash(data);
  }

  /**
   * Decode hash back to original data
   */
  decodeHash(hash: string): PoptavkaHashData | null {
    console.log('Decoding hash:', hash);
    const data = decodePoptavkaHash(hash);
    console.log('Decoded data:', data);
    return data;
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
  async navigateToPoptavka(data: PoptavkaHashData, router: any): Promise<void> {
    try {
      console.log('Starting navigation to poptavka with data:', data);
      
      // Generate reversible hash that contains the data
      const hash = this.generateHash(data);
      
      console.log('Generated reversible hash:', hash);
      
      console.log('Navigating to:', `/poptavka?hash=${hash}`);
      router.push(`/poptavka?hash=${hash}`);
      
    } catch (error) {
      console.error('Navigation failed:', error);
      router.push('/poptavka');
    }
  }
}

// Export singleton instance
export const hashService = new HashService();