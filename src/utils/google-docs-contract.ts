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
  
  // Format prices
  const formatPrice = (price: number | undefined): string => {
    if (!price || price === 0) return '';
    return `${price} Kč`;
  };
  
  // Get cleaning frequency - extract just the number since template has "x týdně" after it
  // The contract template uses: "{{cetnost_uklidu}} x týdně"
  const getCleaningFrequencyNumber = (): string => {
    if (offerData.cleaningFrequencyLabel) {
      // Extract number from label like "1x týdně" -> "1"
      const match = offerData.cleaningFrequencyLabel.match(/^(\d+)/);
      if (match) return match[1];
    }
    
    // Map frequency values to numbers
    if (offerData.cleaningFrequency === 'daily') return '7';
    if (offerData.cleaningFrequency === 'three-times-weekly') return '3';
    if (offerData.cleaningFrequency === 'twice-weekly') return '2';
    if (offerData.cleaningFrequency === 'weekly') return '1';
    if (offerData.cleaningFrequency === 'biweekly') return '1'; // 1x za 14 dní
    if (offerData.cleaningFrequency === 'monthly') return '1'; // 1x měsíčně
    
    return '1'; // Default
  };
  
  const cleaningFrequency = getCleaningFrequencyNumber();
  
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
      
      // Cleaning frequency
      '{{cetnost_uklidu}}': cleaningFrequency,
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

    // First, process conditional blocks ({{#if ...}}...{{/if}})
    const { processConditionalBlocks } = await import('@/utils/google-docs');
    await processConditionalBlocks(clonedDoc.documentId, conditions);
    console.log('[Google Docs Contract] Conditional blocks processed');

    // Then replace all variables in the document
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (value) {
        try {
          await replaceTextInGoogleDoc(clonedDoc.documentId, placeholder, value, false);
          console.log(`[Google Docs Contract] Replaced ${placeholder} with value`);
        } catch (error) {
          console.error(`[Google Docs Contract] Failed to replace ${placeholder}:`, error);
          // Continue with other replacements even if one fails
        }
      }
    }

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

