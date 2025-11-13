// Zip code to region mapping utility

// Region mapping from the original form to the CSV region names
const REGION_MAPPING: Record<string, string> = {
  "prague": "Hlavní město Praha",
  "stredocesky": "Středočeský",
  "karlovarsky": "Karlovarský",
  "plzensky": "Plzeňský",
  "ustecky": "Ústecký",
  "jihocesky": "Jihočeský",
  "liberecky": "Liberecký",
  "kralovehradecky": "Královéhradecký",
  "pardubicky": "Pardubický",
  "vysocina": "Vysočina",
  "jihomoravsky": "Jihomoravský",
  "olomoucky": "Olomoucký",
  "zlinsky": "Zlínský",
  "moravskoslezsky": "Moravskoslezský"
};

// Cache for zip code to region mapping
let zipCodeCache: Map<string, string> | null = null;

// Load and parse the CSV data
async function loadZipCodeMapping(): Promise<Map<string, string>> {
  if (zipCodeCache) {
    return zipCodeCache;
  }

  // Allow tests/server environments to skip CSV fetch
  if (typeof process !== 'undefined' && process.env && process.env.HH_SKIP_ZIP_RESOLVE === '1') {
    zipCodeCache = new Map();
    return zipCodeCache;
  }

  try {
    let csvText = '';
    const isBrowser = typeof window !== 'undefined' && typeof fetch !== 'undefined';
    const baseOrigin = isBrowser
      ? window.location.origin
      : (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_APP_URL) || '';
    if (!baseOrigin) {
      return new Map();
    }
    try {
      const url = new URL('/lib/zv_cobce_psc.csv', baseOrigin).toString();
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) {
        return new Map();
      }
      csvText = await response.text();
    } catch {
      return new Map();
    }
    
    const lines = csvText.split('\n');
    const mapping = new Map<string, string>();
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(';');
      if (columns.length >= 9) {
        const zipCode = columns[2].trim(); // psc column
        const regionName = columns[8].trim(); // nazevkraj column
        
        if (zipCode && regionName) {
          // Find the corresponding region key
          const regionKey = Object.keys(REGION_MAPPING).find(
            key => REGION_MAPPING[key] === regionName
          );
          
          if (regionKey) {
            mapping.set(zipCode, regionKey);
          }
        }
      }
    }
    
    zipCodeCache = mapping;
    return mapping;
  } catch (error) {
    // Suppress noisy logs in tests when explicit skip flag is set
    if (!(typeof process !== 'undefined' && process.env && process.env.HH_SKIP_ZIP_RESOLVE === '1')) {
      const { logger } = await import('./logger');
      logger.error('Error loading zip code mapping:', error, { prefix: 'ZIP' });
    }
    return new Map();
  }
}

// Get region key from zip code
export async function getRegionFromZipCode(zipCode: string): Promise<string | null> {
  const mapping = await loadZipCodeMapping();
  return mapping.get(zipCode) || null;
}

// Validate zip code format (exactly 5 digits)
export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}

// Get all available regions
export function getAvailableRegions(): Array<{ value: string; label: string; coefficient: number }> {
  return [
    { value: "prague", label: "Praha", coefficient: 1.0 },
    { value: "stredocesky", label: "Středočeský kraj", coefficient: 0.96078 },
    { value: "karlovarsky", label: "Karlovarský kraj", coefficient: 0.72549 },
    { value: "plzensky", label: "Plzeňský kraj", coefficient: 0.75686 },
    { value: "ustecky", label: "Ústecký kraj", coefficient: 0.69019 },
    { value: "jihocesky", label: "Jihočeský kraj", coefficient: 0.75294 },
    { value: "liberecky", label: "Liberecký kraj", coefficient: 0.76863 },
    { value: "kralovehradecky", label: "Královéhradecký kraj", coefficient: 0.75294 },
    { value: "pardubicky", label: "Pardubický kraj", coefficient: 0.75294 },
    { value: "vysocina", label: "Kraj Vysočina", coefficient: 0.68235 },
    { value: "jihomoravsky", label: "Jihomoravský kraj", coefficient: 0.82352 },
    { value: "olomoucky", label: "Olomoucký kraj", coefficient: 0.71372 },
    { value: "zlinsky", label: "Zlínský kraj", coefficient: 0.71372 },
    { value: "moravskoslezsky", label: "Moravskoslezský kraj", coefficient: 0.65098 }
  ];
}
