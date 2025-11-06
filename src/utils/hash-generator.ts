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

/**
 * Abbreviate a camelCase or kebab-case key by taking the first letter of each word
 * Examples:
 *   "cleaningFrequency" -> "cf"
 *   "optionalServicesWeekly" -> "osw"
 *   "window-type" -> "wt"
 *   "hasElevator" -> "he"
 */
function abbreviateKey(key: string): string {
  // Handle camelCase: split on capital letters
  // Handle kebab-case: split on hyphens
  // Handle snake_case: split on underscores
  const words = key
    .replace(/([A-Z])/g, '-$1') // Insert hyphen before capital letters
    .toLowerCase()
    .split(/[-_\s]+/) // Split on hyphens, underscores, or spaces
    .filter(word => word.length > 0);
  
  // Take first letter of each word
  return words.map(word => word[0]).join('');
}

/**
 * Cache for reverse mapping during encoding/decoding
 * This is built dynamically as we process keys
 */
let keyReverseMapCache: Record<string, string> = {};

/**
 * Abbreviate a key and store the reverse mapping
 */
function abbreviateKeyWithCache(key: string): string {
  const abbrev = abbreviateKey(key);
  // Store reverse mapping (last one wins if there are conflicts, but that's rare)
  keyReverseMapCache[abbrev] = key;
  return abbrev;
}

/**
 * Expand an abbreviation back to full key using cache
 * Falls back to abbreviation if not found in cache
 */
function expandKey(abbrev: string): string {
  return keyReverseMapCache[abbrev] || abbrev;
}

/**
 * Abbreviate a value using the same algorithm as keys
 * For kebab-case values like "hard-to-reach" -> "htr"
 * For already short values (<= 3 chars), keep as-is
 */
function abbreviateValue(value: string): string {
  // If already short, don't abbreviate (saves space for common values like "yes", "no")
  if (value.length <= 3) {
    return value;
  }
  
  // Use same algorithm as keys
  return abbreviateKey(value);
}

/**
 * Cache for reverse mapping of values during encoding/decoding
 */
let valueReverseMapCache: Record<string, string> = {};

/**
 * Abbreviate a value and store the reverse mapping
 */
function abbreviateValueWithCache(value: string): string {
  const abbrev = abbreviateValue(value);
  valueReverseMapCache[abbrev] = value;
  return abbrev;
}

/**
 * Expand a value abbreviation back to full value using cache
 */
function expandValue(abbrev: string): string {
  return valueReverseMapCache[abbrev] || abbrev;
}

/**
 * Reset caches (call before encoding/decoding a new hash)
 */
function resetCaches(): void {
  keyReverseMapCache = {};
  valueReverseMapCache = {};
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
  // stt (serviceTitle) omitted to save space; derive from config when needed
  tp: number; // totalPrice
  // c (currency) omitted when default 'Kč' to save space
  c?: string; // currency
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
    fd?: Record<string, unknown>; // formData (with abbreviated keys/values)
    km?: Record<string, string>; // keyMap: reverse mapping for abbreviated keys
    vm?: Record<string, string>; // valueMap: reverse mapping for abbreviated values
    // Removed: calculationDetails (can be reconstructed)
    // Removed: winterPeriod (can be from formConfig)
    // Removed: timestamp (not critical)
    // Removed: price (redundant with totalPrice)
    // Removed: serviceTitle (redundant with serviceTitle)
  };
}

/**
 * Minify formData keys and values using algorithm
 * Returns the minified data and the reverse mappings
 */
function minifyFormData(fd: Record<string, unknown>): {
  minified: Record<string, unknown>;
  keyMap: Record<string, string>;
  valueMap: Record<string, string>;
} {
  resetCaches(); // Reset caches for new encoding
  const minified: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(fd)) {
    // Abbreviate key using algorithm
    const minKey = abbreviateKeyWithCache(key);
    
    // Minify value based on type
    let minValue = value;
    
    if (typeof value === 'string') {
      // Abbreviate value using algorithm
      minValue = abbreviateValueWithCache(value);
    } else if (Array.isArray(value)) {
      // Abbreviate array values
      minValue = value.map((item) => {
        if (typeof item === 'string') {
          return abbreviateValueWithCache(item);
        }
        return item;
      });
    }
    
    minified[minKey] = minValue;
  }
  
  return {
    minified,
    keyMap: { ...keyReverseMapCache },
    valueMap: { ...valueReverseMapCache },
  };
}

/**
 * Expand formData keys and values back to full names using reverse mappings
 * If reverse mappings are not provided (old hash format), return data as-is
 */
function expandFormData(
  fd: Record<string, unknown>,
  keyMap?: Record<string, string>,
  valueMap?: Record<string, string>
): Record<string, unknown> {
  // If no reverse mappings provided, assume old hash format - return as-is
  if (!keyMap && !valueMap) {
    return fd;
  }
  
  // Load reverse mappings into cache
  if (keyMap) {
    keyReverseMapCache = { ...keyMap };
  }
  if (valueMap) {
    valueReverseMapCache = { ...valueMap };
  }
  
  const expanded: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(fd)) {
    // Expand key using cache (falls back to original if not in cache)
    const expKey = expandKey(key);
    
    // Expand value based on type
    let expValue = value;
    
    if (typeof value === 'string') {
      // Expand value using cache (falls back to original if not in cache)
      expValue = expandValue(value);
    } else if (Array.isArray(value)) {
      // Expand array values
      expValue = value.map((item) => {
        if (typeof item === 'string') {
          return expandValue(item);
        }
        return item;
      });
    }
    
    expanded[expKey] = expValue;
  }
  
  return expanded;
}

/**
 * Convert full hash data to minimal structure
 */
function minifyHashData(data: PoptavkaHashData): MinimalPoptavkaHashData {
  // Helper: clean form data by removing empty/default/redundant fields
  const cleanAndMinifyFormData = (fd?: Record<string, unknown>): {
    minified?: Record<string, unknown>;
    keyMap?: Record<string, string>;
    valueMap?: Record<string, string>;
  } => {
    if (!fd) return {};
    const cleaned: Record<string, unknown> = {};
    const email = typeof fd.email === 'string' ? (fd.email as string) : undefined;
    const isCompany = Boolean(fd.isCompany);
    for (const [key, value] of Object.entries(fd)) {
      // Drop redundant or derivable fields
      if (key === 'name' || key === 'address' || key === 'serviceType') continue;
      // Drop empty strings, null, undefined
      if (value === '' || value === null || value === undefined) continue;
      // Drop false booleans to save space
      if (typeof value === 'boolean' && value === false) continue;
      // Drop empty arrays
      if (Array.isArray(value) && value.length === 0) continue;
      // If not a company, drop company fields
      if (!isCompany && (key === 'companyName' || key === 'companyIco' || key === 'companyDic' || key === 'companyStreet' || key === 'companyCity' || key === 'companyZipCode')) {
        continue;
      }
      // Drop invoiceEmail if same as email
      if (key === 'invoiceEmail' && typeof value === 'string' && email && value === email) continue;
      cleaned[key] = value;
    }
    // Minify the cleaned formData
    if (Object.keys(cleaned).length > 0) {
      const result = minifyFormData(cleaned);
      return result;
    }
    return {};
  };

  const minimal: MinimalPoptavkaHashData = {
    st: data.serviceType,
    tp: data.totalPrice,
    ...(data.currency && data.currency !== 'Kč' ? { c: data.currency } : {}),
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
    const formDataResult = cleanAndMinifyFormData(data.calculationData.formData as Record<string, unknown> | undefined);
    if (formDataResult.minified) {
      minimal.cd.fd = formDataResult.minified;
      // Store reverse mappings if they exist
      if (formDataResult.keyMap && Object.keys(formDataResult.keyMap).length > 0) {
        minimal.cd.km = formDataResult.keyMap;
      }
      if (formDataResult.valueMap && Object.keys(formDataResult.valueMap).length > 0) {
        minimal.cd.vm = formDataResult.valueMap;
      }
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
    serviceTitle: '', // derive from config if needed by consumer
    totalPrice: minimal.tp,
    currency: minimal.c || 'Kč',
  };

  if (minimal.cd) {
    // Expand formData if it exists, using reverse mappings from hash
    const expandedFormData = minimal.cd.fd 
      ? expandFormData(
          minimal.cd.fd as Record<string, unknown>,
          minimal.cd.km,
          minimal.cd.vm
        )
      : undefined;
    
    data.calculationData = {
      regularCleaningPrice: minimal.cd.rcp ?? 0,
      totalMonthlyPrice: minimal.cd.tmp,
      formData: expandedFormData,
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
    // Minimal hashes include short keys like 'st' and typically 'cd'/'tp'.
    if (parsed && typeof parsed === 'object' && ('st' in parsed) && (('cd' in parsed) || ('tp' in parsed))) {
      return expandHashData(parsed as MinimalPoptavkaHashData);
    }
    // Otherwise treat as full format (old hash)
    return parsed as PoptavkaHashData;
  } catch {
    // Silently fail - invalid hash
    return null;
  }
}

export function createPoptavkaUrl(hash: string, baseUrl: string = ''): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/poptavka?hash=${hash}`;
}