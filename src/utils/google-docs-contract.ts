import {
  cloneGoogleDoc,
  replaceTextInGoogleDoc,
} from "@/utils/google-docs";
import { OfferData } from "@/pdf/templates/OfferPDF";

/**
 * Determine contract type based on service type
 * Returns 'residential' for residential-building and panel-building
 * Returns 'commercial' for office-cleaning and commercial-spaces
 */
export function getContractType(serviceType: string | undefined): 'residential' | 'commercial' | null {
  if (!serviceType) return null;
  
  if (serviceType === 'residential-building' || serviceType === 'panel-building') {
    return 'residential';
  }
  
  if (serviceType === 'office-cleaning' || serviceType === 'commercial-spaces') {
    return 'commercial';
  }
  
  return null;
}

/**
 * Get the template document ID based on contract type
 */
function getTemplateDocumentId(contractType: 'residential' | 'commercial'): string | null {
  if (contractType === 'residential') {
    return process.env.GOOGLE_DOC_RESIDENTIAL_ID || null;
  }
  
  if (contractType === 'commercial') {
    return process.env.GOOGLE_DOC_COMMERCIAL_ID || null;
  }
  
  return null;
}

/**
 * Generate a filename for the contract
 */
function generateContractFilename(
  offerData: OfferData
): string {
  const date = new Date();
  const dateStr = date.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\s/g, '_');
  
  const serviceTitle = offerData.serviceTitle || 'uklid';
  const customerName = offerData.customer?.name || 'zakaznik';
  // Customer can have additional properties like company that aren't in the base type
  const customerData = offerData.customer as typeof offerData.customer & {
    company?: { name?: string };
  };
  const companyName = customerData.company?.name || '';
  
  // Clean up names for filename
  const cleanCustomerName = customerName.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '_');
  const cleanCompanyName = companyName ? `_${companyName.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '_')}` : '';
  const cleanServiceTitle = serviceTitle.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '_');
  
  return `smlouva_${dateStr}_${cleanServiceTitle}_${cleanCustomerName}${cleanCompanyName}`;
}

/**
 * Format cleaning services list for Word template
 * Uses the same logic as PDF generation, including optional services
 */
function formatCleaningServicesList(
  commonServices?: {
    weekly?: string[];
    monthly?: string[];
    biAnnual?: string[];
    perCleaning?: string[];
    generalCleaning?: string[];
  },
  cleaningFrequency?: string
): string {
  if (!commonServices) return '';

  // Map cleaning frequency to commonServices key
  // Weekly frequencies map to weekly, monthly to monthly
  const frequencyMap: Record<string, 'weekly' | 'monthly'> = {
    'weekly': 'weekly',
    'twice-weekly': 'weekly',
    'biweekly': 'weekly',
    'daily': 'weekly',
    'workdays': 'weekly', // Commercial spaces: every workday
    'everyday': 'weekly', // Commercial spaces: every day including weekends
    '3x-weekly': 'weekly',
    '2x-weekly': 'weekly',
    'daily-basic-weekly': 'weekly',
    'daily-basic-weekly-wc': 'weekly',
    'daily-weekends-basic-weekly': 'weekly',
    'daily-weekends-basic-weekly-wc': 'weekly',
    'monthly': 'monthly'
  };

  // Merge perCleaning into the appropriate frequency category
  const mergedServices: typeof commonServices = { ...commonServices };

  if (cleaningFrequency && commonServices.perCleaning && commonServices.perCleaning.length > 0) {
    const targetKey = frequencyMap[cleaningFrequency];
    if (targetKey) {
      // Merge perCleaning services into the frequency category
      mergedServices[targetKey] = [
        ...(mergedServices[targetKey] || []),
        ...commonServices.perCleaning
      ];
      // Remove perCleaning since it's now merged
      delete mergedServices.perCleaning;
    }
  }

  // Define service categories with their labels
  const serviceCategories = [
    { key: 'weekly', label: 'Při každém úklidu' },
    { key: 'monthly', label: '1 x měsíčně' },
    { key: 'perCleaning', label: 'Při každém úklidu' }, // Fallback if perCleaning wasn't merged
    { key: 'generalCleaning', label: 'V rámci pravidelného generálního úklidu (pokud je zadán v poptávkovém formuláři)' }
  ];

  // Filter to only categories that have content
  const activeCategories = serviceCategories.filter(category => {
    const services = mergedServices[category.key as keyof typeof mergedServices] as string[] | undefined;
    return services && services.length > 0;
  });

  if (activeCategories.length === 0) return '';

  // Build plain text with ASCII formatting: category titles, bullets, and empty lines between sections
  const blocks: string[] = [];

  activeCategories.forEach((category, categoryIndex) => {
    const categoryHeading = category.label;
    
    const services = mergedServices[category.key as keyof typeof mergedServices] as string[];
    
    // Separate standard services from optional services
    const standardServices: string[] = [];
    const optionalServices: string[] = [];

    services.forEach(service => {
      if (service.startsWith('příplatkové služby:')) {
        const serviceName = service.replace(/^příplatkové služby:\s*/, '');
        optionalServices.push(serviceName);
      } else {
        standardServices.push(service);
      }
    });

    // Add empty line before category (except first one)
    if (categoryIndex > 0) {
      blocks.push('');
    }
    
    // Add category heading
    blocks.push(categoryHeading);
    
    // Add standard services with bullets
    standardServices.forEach(service => {
      blocks.push('- ' + service);
    });

    // Add optional services section if any
    if (optionalServices.length > 0) {
      blocks.push('- Příplatkové služby:');
      // Optional services with double indent
      optionalServices.forEach(service => {
        blocks.push('  - ' + service);
      });
    }
  });

  return blocks.join('\n');
}

/**
 * Map OfferData to contract template variables and condition flags
 * Returns both string replacements and boolean flags for conditionals
 */
function mapOfferDataToContractVariables(offerData: OfferData): {
  replacements: Record<string, string>;
  conditions: Record<string, boolean | number | string | undefined>;
} {
  const customer = offerData.customer || {};
  // Customer can have additional properties like company and invoiceEmail that aren't in the base type
  const customerData = customer as typeof customer & {
    company?: { name?: string; address?: string; ico?: string; dic?: string };
    invoiceEmail?: string;
  };
  const company = customerData.company || {};
  
  // Format dates
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    // If already in DD.MM.YYYY format, return as is
    if (dateStr.includes('.') && dateStr.length >= 8) {
      return dateStr;
    }
    // If in ISO format (YYYY-MM-DD), convert to DD.MM.YYYY
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    }
    return dateStr;
  };
  
  // Format prices with space as thousand separator (e.g., 5 600 Kč)
  const formatPrice = (price: number | undefined): string => {
    if (!price || price === 0) return '';
    // Format with Czech locale to use space as thousand separator
    return `${price.toLocaleString('cs-CZ')} Kč`;
  };
  
  
  // Check if general cleaning is opted for
  const hasGeneralCleaning = offerData.generalCleaningPrice !== undefined && 
                             offerData.generalCleaningPrice !== null && 
                             offerData.generalCleaningPrice > 0;
  
  return {
    replacements: {
      // Company information
      '{{nazev_spolecnosti}}': company.name || '',
      '{{sidlo_spolecnosti}}': company.address || '',
      '{{ico}}': company.ico || '',
      '{{dic}}': company.dic || '',
      '{{jmeno_jednatele}}': customer.name || '',
      
      // Property/cleaning address
      '{{adresa_uklidu}}': customer.address || '',
      
      // Prices
      '{{cena_pravidelneho_uklidu}}': formatPrice(offerData.price),
      '{{cena_generalniho_uklidu}}': formatPrice(offerData.generalCleaningPrice),
      
      // Contact information
      '{{fakturacni_email}}': customerData.invoiceEmail || customer.email || '',
      '{{kontaktni_telefon}}': customer.phone || '',
      '{{kontaktni_email}}': customer.email || '',
      
      // Dates
      '{{datum_zahajeni_uklidu}}': formatDate(offerData.startDate),
      
      // Cleaning services list - plain text, will be formatted after insertion
      '{{uklid_obsahuje}}': formatCleaningServicesList(offerData.commonServices, offerData.cleaningFrequency),
    },
    conditions: {
      // Conditional flags for {{#if ...}} blocks
      generalni_uklid: hasGeneralCleaning,
      // Add more conditions here as needed
    },
  };
}

/**
 * Generate a contract from Google Docs template
 * @param offerData - The offer data from the form submission
 * @returns Promise with the new document ID and name
 */
export async function generateContractFromTemplate(
  offerData: OfferData
): Promise<{ documentId: string; name: string; url: string } | null> {
  try {
    // Check if this is a regular cleaning service (not hourly)
    const isRegularCleaning = !offerData.isHourlyService;
    if (!isRegularCleaning) {
      console.log('[Google Docs Contract] Skipping contract generation for hourly service');
      return null;
    }

    // Determine contract type
    const contractType = getContractType(offerData.serviceType);
    if (!contractType) {
      console.log('[Google Docs Contract] No contract template available for service type:', offerData.serviceType);
      return null;
    }

    // Get template document ID
    const templateId = getTemplateDocumentId(contractType);
    if (!templateId) {
      console.error('[Google Docs Contract] Template document ID not found for type:', contractType);
      return null;
    }

    // Get folder ID
    const folderId = process.env.GDRIVE_CONTRACT_FOLDER_ID;
    if (!folderId) {
      console.error('[Google Docs Contract] GDRIVE_CONTRACT_FOLDER_ID environment variable not set');
      return null;
    }

    // Generate filename
    const filename = generateContractFilename(offerData);

    // Clone the template to the folder
    console.log('[Google Docs Contract] Cloning template document:', {
      templateId,
      filename,
      folderId,
    });

    const clonedDoc = await cloneGoogleDoc(templateId, filename, folderId);
    console.log('[Google Docs Contract] Document cloned successfully:', clonedDoc.documentId);

    // Map variables and conditions
    const { replacements, conditions } = mapOfferDataToContractVariables(offerData);
    console.log('[Google Docs Contract] Replacing variables:', Object.keys(replacements));
    console.log('[Google Docs Contract] Processing conditions:', Object.keys(conditions));


    // Replace uklid_obsahuje with plain text (formatting will be applied after)
    const uklidValue = replacements['{{uklid_obsahuje}}'];
    if (uklidValue) {
      try {
        await replaceTextInGoogleDoc(clonedDoc.documentId, '{{uklid_obsahuje}}', uklidValue, false);
        console.log('[Google Docs Contract] Replaced {{uklid_obsahuje}} placeholder with text');
      } catch (error) {
        console.error('[Google Docs Contract] Failed to replace uklid_obsahuje:', error);
      }
    }

    // Then replace all other variables in the document
    for (const [placeholder, value] of Object.entries(replacements)) {
      // Skip uklid_obsahuje as we handled it above
      if (placeholder === '{{uklid_obsahuje}}') {
        continue;
      }
      
      // For other placeholders, only replace if value is truthy
      if (value) {
        try {
          await replaceTextInGoogleDoc(clonedDoc.documentId, placeholder, value, false);
          console.log(`[Google Docs Contract] Replaced ${placeholder} with value`);
        } catch (error) {
          console.error(`[Google Docs Contract] Failed to replace ${placeholder}:`, error);
          // Continue with other replacements even if one fails
        }
      } else {
        console.log(`[Google Docs Contract] Skipping ${placeholder} (empty value)`);
      }
    }

    // Process conditional blocks ({{#if ...}}...{{/if}})
    const { processConditionalBlocks } = await import('@/utils/google-docs');
    await processConditionalBlocks(clonedDoc.documentId, conditions);
    console.log('[Google Docs Contract] Conditional blocks processed');


    const documentUrl = `https://docs.google.com/document/d/${clonedDoc.documentId}/edit`;

    console.log('[Google Docs Contract] Contract generated successfully:', {
      documentId: clonedDoc.documentId,
      name: clonedDoc.name,
      url: documentUrl,
    });

    return {
      documentId: clonedDoc.documentId,
      name: clonedDoc.name,
      url: documentUrl,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Google Docs Contract] Failed to generate contract:', errorMsg);
    // Don't throw - allow the main flow to continue even if contract generation fails
    return null;
  }
}

