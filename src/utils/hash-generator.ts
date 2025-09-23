export interface PoptavkaHashData {
  serviceType: string;
  serviceTitle: string;
  totalPrice: number;
  currency: string;
  calculationData?: Record<string, unknown>; // Detailed calculation data
}

/**
 * Generate a reversible hash that contains the data itself
 * Uses base64 encoding to embed the data in the hash
 */
export function generatePoptavkaHash(data: PoptavkaHashData): string {
  const dataString = JSON.stringify(data);
  // Use proper UTF-8 encoding for base64
  const base64 = btoa(unescape(encodeURIComponent(dataString)));
  // URL encode to handle special characters properly
  return encodeURIComponent(base64);
}

/**
 * Check if a string is valid base64 and fix padding if needed
 */
function isValidBase64(str: string): { isValid: boolean; fixedString?: string } {
  // Basic checks first
  if (!str || typeof str !== 'string') {
    return { isValid: false };
  }
  
  // Check minimum length (at least 4 characters for valid base64)
  if (str.length < 4) {
    return { isValid: false };
  }
  
  // Check if string contains only valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) {
    return { isValid: false };
  }
  
  // Fix padding if needed
  let fixedStr = str;
  const remainder = str.length % 4;
  if (remainder !== 0) {
    fixedStr = str + '='.repeat(4 - remainder);
  }
  
  try {
    // Try to decode to see if it's actually valid
    atob(fixedStr);
    return { isValid: true, fixedString: fixedStr };
  } catch {
    // If atob fails, it's not valid base64
    return { isValid: false };
  }
}

/**
 * Decode the hash back to the original data
 */
export function decodePoptavkaHash(encodedHash: string): PoptavkaHashData | null {
  try {
    // URL decode first
    const base64 = decodeURIComponent(encodedHash);
    
    // Validate base64 and fix padding if needed
    const validation = isValidBase64(base64);
    if (!validation.isValid) {
      return null;
    }
    
    // Use the fixed string if padding was corrected
    const finalBase64 = validation.fixedString || base64;
    
    // Base64 decode with proper UTF-8 handling
    const dataString = decodeURIComponent(escape(atob(finalBase64)));
    return JSON.parse(dataString);
  } catch {
    // Silently fail - invalid hash
    return null;
  }
}

export function createPoptavkaUrl(hash: string, baseUrl: string = ''): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/poptavka?hash=${hash}`;
}