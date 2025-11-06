import { CalculationResult } from "@/types/form-types";
import LZString from "lz-string";

export interface CalculationData extends CalculationResult {
  formData?: Record<string, unknown>;
  orderId?: string;
  winterPeriod?: {
    start: { day: number; month: number };
    end: { day: number; month: number };
  };
  // Additional metadata fields
  timestamp?: number;
  price?: number;
  serviceTitle?: string;
}

export interface PoptavkaHashData {
  serviceType: string;
  serviceTitle: string;
  totalPrice: number;
  currency: string;
  calculationData?: CalculationData; // Detailed calculation data
}

/**
 * Minimal hash data structure - only stores essential data
 * All other data can be reconstructed from formConfig
 */
export interface MinimalPoptavkaHashData {
  st: string; // serviceType
  stt: string; // serviceTitle
  tp: number; // totalPrice
  c: string; // currency
  cd?: {
    // calculationData - minimal fields only
    rcp?: number; // regularCleaningPrice
    gcp?: number; // generalCleaningPrice
    gcf?: string; // generalCleaningFrequency
    tmp: number; // totalMonthlyPrice
    hr?: number; // hourlyRate
    wsf?: number; // winterServiceFee
    wcf?: number; // winterCalloutFee
    oid?: string; // orderId
    fd?: Record<string, unknown>; // formData
    // Removed: calculationDetails (can be reconstructed)
    // Removed: winterPeriod (can be from formConfig)
    // Removed: timestamp (not critical)
    // Removed: price (redundant with totalPrice)
    // Removed: serviceTitle (redundant with serviceTitle)
  };
}

/**
 * Convert full hash data to minimal structure
 */
function minifyHashData(data: PoptavkaHashData): MinimalPoptavkaHashData {
  const minimal: MinimalPoptavkaHashData = {
    st: data.serviceType,
    stt: data.serviceTitle,
    tp: data.totalPrice,
    c: data.currency || 'Kč',
  };

  if (data.calculationData) {
    minimal.cd = {
      rcp: data.calculationData.regularCleaningPrice,
      tmp: data.calculationData.totalMonthlyPrice,
    };

    if (data.calculationData.generalCleaningPrice !== undefined) {
      minimal.cd.gcp = data.calculationData.generalCleaningPrice;
    }
    if (data.calculationData.generalCleaningFrequency) {
      minimal.cd.gcf = data.calculationData.generalCleaningFrequency;
    }
    if (data.calculationData.hourlyRate !== undefined) {
      minimal.cd.hr = data.calculationData.hourlyRate;
    }
    if (data.calculationData.winterServiceFee !== undefined) {
      minimal.cd.wsf = data.calculationData.winterServiceFee;
    }
    if (data.calculationData.winterCalloutFee !== undefined) {
      minimal.cd.wcf = data.calculationData.winterCalloutFee;
    }
    if (data.calculationData.orderId) {
      minimal.cd.oid = data.calculationData.orderId;
    }
    if (data.calculationData.formData) {
      minimal.cd.fd = data.calculationData.formData;
    }
  }

  return minimal;
}

/**
 * Convert minimal hash data back to full structure
 * Note: calculationDetails will be reconstructed when needed using reconstructCalculationDetails
 */
function expandHashData(minimal: MinimalPoptavkaHashData): PoptavkaHashData {
  const data: PoptavkaHashData = {
    serviceType: minimal.st,
    serviceTitle: minimal.stt,
    totalPrice: minimal.tp,
    currency: minimal.c || 'Kč',
  };

  if (minimal.cd) {
    data.calculationData = {
      regularCleaningPrice: minimal.cd.rcp ?? 0,
      totalMonthlyPrice: minimal.cd.tmp,
      formData: minimal.cd.fd,
      orderId: minimal.cd.oid,
      // calculationDetails will be reconstructed when needed
      // Provide empty structure for now to satisfy type requirements
      calculationDetails: {
        basePrice: 0,
        appliedCoefficients: [],
        finalCoefficient: 1
      }
    } as CalculationData;

    if (minimal.cd.gcp !== undefined) {
      data.calculationData.generalCleaningPrice = minimal.cd.gcp;
    }
    if (minimal.cd.gcf) {
      data.calculationData.generalCleaningFrequency = minimal.cd.gcf;
    }
    if (minimal.cd.hr !== undefined) {
      data.calculationData.hourlyRate = minimal.cd.hr;
    }
    if (minimal.cd.wsf !== undefined) {
      data.calculationData.winterServiceFee = minimal.cd.wsf;
    }
    if (minimal.cd.wcf !== undefined) {
      data.calculationData.winterCalloutFee = minimal.cd.wcf;
    }

    // calculationDetails will be reconstructed when needed
    // This ensures backward compatibility - old hashes will still work
  }

  return data;
}

/**
 * Generate a reversible hash that contains the data itself
 * Uses compression and minification to reduce hash size
 */
export function generatePoptavkaHash(data: PoptavkaHashData): string {
  // Convert to minimal structure
  const minimal = minifyHashData(data);
  
  // Stringify and compress
  const dataString = JSON.stringify(minimal);
  const compressed = LZString.compressToEncodedURIComponent(dataString);
  
  // If compression didn't help or failed, fall back to base64
  if (!compressed || compressed.length > dataString.length * 0.9) {
    // Fallback to base64 encoding for backward compatibility
    const base64 = btoa(unescape(encodeURIComponent(dataString)));
    return encodeURIComponent(base64);
  }
  
  return compressed;
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
 * Supports both compressed (new) and base64 (old) formats
 */
export function decodePoptavkaHash(encodedHash: string): PoptavkaHashData | null {
  try {
    // Try to decompress first (new format)
    const decompressed = LZString.decompressFromEncodedURIComponent(encodedHash);
    if (decompressed) {
      const minimal = JSON.parse(decompressed) as MinimalPoptavkaHashData;
      return expandHashData(minimal);
    }
    
    // Fallback to base64 decoding (old format for backward compatibility)
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
    const parsed = JSON.parse(dataString);
    
    // Check if it's minimal format or full format
    if (parsed.st && parsed.stt) {
      // It's already minimal format
      return expandHashData(parsed as MinimalPoptavkaHashData);
    } else {
      // It's full format (old hash)
      return parsed as PoptavkaHashData;
    }
  } catch {
    // Silently fail - invalid hash
    return null;
  }
}

export function createPoptavkaUrl(hash: string, baseUrl: string = ''): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/poptavka?hash=${hash}`;
}