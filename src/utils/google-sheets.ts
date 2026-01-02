import { google } from "googleapis";
import type { OfferData } from "@/pdf/templates/OfferPDF";

// Type definitions for Google Sheets API
type SheetProperties = { properties?: { title?: string; sheetId?: number } };

type SheetsApiType = {
  spreadsheets: {
    get: (options: { spreadsheetId: string; fields?: string }) => Promise<{
      data: {
        spreadsheetId?: string;
        properties?: { title?: string };
        sheets?: Array<SheetProperties>;
      };
    }>;
    values: {
      append: (options: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        requestBody: { values: unknown[][] };
      }) => Promise<{ data: { updates?: { updatedRows?: number } } }>;
    };
  };
};

/**
 * Get Google Sheets client using Service Account authentication
 * This is more reliable than OAuth for server-side operations
 */
function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required for Google Sheets integration');
  }

  // Use type assertion to work with GoogleAuth
  const GoogleAuth = (google.auth as { GoogleAuth: new (options: {
    credentials?: {
      client_email?: string;
      private_key?: string;
    };
    scopes?: string[];
  }) => unknown }).GoogleAuth;

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth: auth as { getClient(): Promise<unknown> } });
}

/**
 * Write submission data to Google Sheets using Service Account
 * @param params - Parameters for writing to sheets
 * @returns Promise with success status
 */
export async function writeToGoogleSheets(params: {
  spreadsheetId: string;
  offerData: OfferData;
  isPoptavka: boolean;
  contractUrl?: string;
}): Promise<{ success: boolean }> {
  const { spreadsheetId, offerData, isPoptavka, contractUrl } = params;

  const sheets = getSheetsClient();

  // First, verify we can access the spreadsheet
  try {
    const sheetsApi = sheets as unknown as SheetsApiType;
    
    const spreadsheetInfo = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId,properties.title,sheets.properties.title,sheets.properties.sheetId',
    });
    
    console.log('[Google Sheets] Spreadsheet accessed successfully:', {
      id: spreadsheetInfo.data.spreadsheetId,
      title: spreadsheetInfo.data.properties?.title,
      sheets: spreadsheetInfo.data.sheets?.map((s: { properties?: { title?: string } }) => s.properties?.title),
    });
    
    // Verify the "Data" sheet exists
    const dataSheet = spreadsheetInfo.data.sheets?.find((s: { properties?: { title?: string } }) => s.properties?.title === 'Data');
    if (!dataSheet) {
      const availableSheets = spreadsheetInfo.data.sheets?.map((s: { properties?: { title?: string } }) => s.properties?.title).join(', ') || 'none';
      throw new Error(`Sheet "Data" not found. Available sheets: ${availableSheets}`);
    }
  } catch (verifyError) {
    const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
    const is404 = errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('NOT_FOUND');
    
    console.error('[Google Sheets] Failed to verify spreadsheet access:', {
      spreadsheetId,
      error: errorMsg,
      suggestion: is404 
        ? '1) Verify GOOGLE_SHEET_ID is correct (from URL: docs.google.com/spreadsheets/d/SPREADSHEET_ID/...), 2) Ensure service account email (GOOGLE_CLIENT_EMAIL) has edit access to the spreadsheet, 3) Verify GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set correctly'
        : 'Check error message above'
    });
    throw verifyError;
  }

  // Parse customer name into first and last name
  const customerName = offerData.customer?.name || "";
  const nameParts = customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Format date with time (current date in DD.MM.YYYY HH:MM format in CET/CEST timezone)
  const now = new Date();
  // Use Europe/Prague timezone to ensure CET/CEST (Central European Time)
  const formatter = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const day = parts.find(p => p.type === "day")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const year = parts.find(p => p.type === "year")?.value || "";
  const hour = parts.find(p => p.type === "hour")?.value || "";
  const minute = parts.find(p => p.type === "minute")?.value || "";
  const currentDate = `${day}.${month}.${year} ${hour}:${minute}`;

  // Determine request type
  // If contract was generated, it's "Smlouva", otherwise "Poptávka" for poptavka submissions
  const requestType = contractUrl ? "Smlouva" : (isPoptavka ? "Poptávka" : "PDF");

  // Get service type (cleaning type)
  const serviceType = offerData.serviceTitle || "Ostatní služby";

  // Get cleaning price
  const cleaningPrice = offerData.price || 0;

  // Calculate sum of extra items (fixedAddons) - show total price, not list
  const extraItemsTotal = offerData.fixedAddons
    ? offerData.fixedAddons.reduce((sum: number, addon: { amount: number }) => sum + (addon.amount || 0), 0)
    : 0;
  const extraItems = extraItemsTotal > 0 ? `${extraItemsTotal} Kč` : "";

  // Format general cleaning - show price value, empty if no general cleaning
  // Round to nearest 10 Kč to match frontend display (e.g., 3289 -> 3290)
  const generalCleaningPriceRounded = offerData.generalCleaningPrice && offerData.generalCleaningPrice > 0
    ? Math.round(offerData.generalCleaningPrice / 10) * 10
    : 0;
  const generalCleaning = generalCleaningPriceRounded > 0 ? `${generalCleaningPriceRounded} Kč` : "";

  // Format winter maintenance - show price value, empty if no winter maintenance
  const winterMaintenancePrice = offerData.winterServiceFee && offerData.winterServiceFee > 0
    ? offerData.winterServiceFee
    : 0;
  const winterMaintenance = winterMaintenancePrice > 0 ? `${winterMaintenancePrice} Kč` : "";

  // Get customer email
  const email = offerData.customer?.email || "";

  // Get customer phone
  const phone = offerData.customer?.phone || "";

  // Extract company information
  const customerData = offerData.customer as Record<string, unknown> | undefined;
  const company = customerData?.company as { name?: string; ico?: string; dic?: string; address?: string } | undefined;
  const companyName = company?.name || "";
  const companyIco = company?.ico || "";
  const companyDic = company?.dic || "";

  // Parse property address (format: "street, city, zip")
  const propertyAddress = offerData.customer?.address || "";
  const propertyAddressParts = propertyAddress.split(',').map(part => part.trim());
  const propertyStreet = propertyAddressParts[0] || "";
  const propertyCity = propertyAddressParts[1] || "";
  const propertyZip = propertyAddressParts[2] || "";

  // Parse company address (format: "street, city, zip")
  const companyAddress = company?.address || "";
  const companyAddressParts = companyAddress.split(',').map(part => part.trim());
  const companyStreet = companyAddressParts[0] || "";
  const companyCity = companyAddressParts[1] || "";
  const companyZip = companyAddressParts[2] || "";

  // Format service start date (convert from ISO format YYYY-MM-DD to DD.MM.YYYY if needed)
  let serviceStartDate = "";
  if (offerData.startDate) {
    if (offerData.startDate.includes('-')) {
      // ISO format: convert to DD.MM.YYYY
      const [year, month, day] = offerData.startDate.split('-');
      serviceStartDate = `${day}.${month}.${year}`;
    } else {
      // Already in Czech format or other format
      serviceStartDate = offerData.startDate;
    }
  }

  // Get invoice email
  const invoiceEmail = (customerData?.invoiceEmail as string | undefined) || "";

  // Get notes (poptavka notes)
  const notes = offerData.poptavkaNotes || "";

  // Prepare row data matching the column order:
  // A: Datum | B: Typ poptávky | C: Typ úklidu | D: Cena úklidu | E: Extra položky | F: Generální úklid | G: Winter maintenance | 
  // H: Jméno | I: Příjmení | J: E-mail | K: Telefon |
  // L: Název společnosti | M: IČO | N: DIČ | O: Ulice a čp (property) | P: Město (property) | Q: PSČ (property) |
  // R: Ulice a čp (company) | S: Město (company) | T: PSČ (company) | U: Zahájení plnění | V: Fakturační e-mail | W: Poznámka | X: Smlouva
  const rowData = [
    currentDate,        // A: Datum
    requestType,        // B: Typ poptávky
    serviceType,        // C: Typ úklidu
    cleaningPrice,      // D: Cena úklidu
    extraItems,        // E: Extra položky
    generalCleaning,   // F: Generální úklid
    winterMaintenance, // G: Winter maintenance
    firstName,          // H: Jméno
    lastName,          // I: Příjmení
    email,             // J: E-mail
    phone,             // K: Telefon
    companyName,       // L: Název společnosti
    companyIco,        // M: IČO
    companyDic,        // N: DIČ
    propertyStreet,    // O: Ulice a čp (property)
    propertyCity,       // P: Město (property)
    propertyZip,        // Q: PSČ (property)
    companyStreet,      // R: Ulice a čp (company)
    companyCity,        // S: Město (company)
    companyZip,         // T: PSČ (company)
    serviceStartDate,   // U: Zahájení plnění
    invoiceEmail,       // V: Fakturační e-mail
    notes,              // W: Poznámka
    contractUrl || '',  // X: Smlouva (link to contract document)
  ];

  // Append data to the sheet (will automatically find the next available row)
  // Using "USER_ENTERED" to preserve number formatting
  // Try with sheet name first, fallback to range without sheet name
  // Updated range to A:X (24 columns: A-W + new column X for contract link)
  const sheetName = "Data";
  const rangesToTry = [
    `${sheetName}!A:X`,  // Try with explicit sheet name first (24 columns now)
    "A:X",               // Fallback: let API use default sheet
  ];
  
  let lastError: Error | null = null;
  
  const sheetsApi = sheets as unknown as SheetsApiType;
  
  for (const range of rangesToTry) {
    try {
      await sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
      
      // Success - return immediately
      return { success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's a 404, try the next range format
      const is404 = (error as { code?: number }).code === 404 || 
                    (error as { status?: number }).status === 404 ||
                    lastError.message.includes('404') ||
                    lastError.message.includes('not found');
      
      if (is404 && range !== rangesToTry[rangesToTry.length - 1]) {
        // Try next range format
        console.warn(`[Google Sheets] Range "${range}" failed with 404, trying next format...`);
        continue;
      }
      
      // For non-404 errors or last attempt, log and throw
      const errorMessage = lastError.message;
      const errorDetails = error && typeof error === 'object' && 'response' in error 
        ? JSON.stringify((error as { response?: unknown }).response, null, 2)
        : 'No additional details';
      
      console.error('[Google Sheets] Failed to append data:', {
        spreadsheetId,
        range,
        error: errorMessage,
        details: errorDetails,
        suggestion: is404 
          ? 'Check: 1) GOOGLE_SHEET_ID is correct, 2) Service account has edit access, 3) Sheet name is "Data"'
          : 'Check error details above'
      });
      
      throw lastError;
    }
  }
  
  // If we reach here, all ranges failed (shouldn't happen due to throw above, but TypeScript needs this)
  if (lastError) {
    throw lastError;
  }
  
  return { success: true };
}

