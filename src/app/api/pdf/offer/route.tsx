import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { renderOfferPdfBody, OfferData } from "@/pdf/templates/OfferPDF";
import { uploadPdfToDrive } from "@/utils/google-drive";
import fs from "node:fs/promises";
import { hashService } from "@/services/hash-service";
import { buildPoptavkaHashData } from "@/utils/hash-data-builder";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as OfferData;
    
    // If poptavkaHash is provided, decode it to extract poptavkaNotes and other data
    if (data.poptavkaHash) {
      try {
        const decodedHash = hashService.decodeHash(data.poptavkaHash);
        if (decodedHash?.calculationData?.formData) {
          const hashFormData = decodedHash.calculationData.formData as Record<string, unknown>;
          
          // Extract poptavkaNotes from hash if not already set in OfferData
          if (!data.poptavkaNotes && hashFormData.poptavkaNotes) {
            data.poptavkaNotes = String(hashFormData.poptavkaNotes);
          }
          
          // Extract serviceStartDate from hash if not already set
          if (!data.startDate && hashFormData.serviceStartDate) {
            const dateStr = String(hashFormData.serviceStartDate);
            // Convert ISO format (YYYY-MM-DD) to Czech format (DD. MM. YYYY) if needed
            if (dateStr.includes('-') && dateStr.length === 10) {
              const [year, month, day] = dateStr.split('-');
              data.startDate = `${day}. ${month}. ${year}`;
            } else {
              data.startDate = dateStr;
            }
          }
          
          // Extract serviceType from hash if not already set
          if (!data.serviceType && decodedHash.serviceType) {
            data.serviceType = decodedHash.serviceType;
          }
          
          // Reconstruct fixedAddons for hourly services if not already present
          if (data.isHourlyService && !data.fixedAddons && decodedHash.calculationData) {
            const { getFormConfig } = await import("@/config/services");
            const formConfig = getFormConfig(decodedHash.serviceType);
            if (formConfig) {
              const { convertFormDataToOfferData } = await import("@/utils/form-to-offer-data");
              // Create a temporary OfferData to extract fixedAddons
              const tempOfferData = await convertFormDataToOfferData(
                hashFormData as import("@/types/form-types").FormSubmissionData,
                decodedHash.calculationData as import("@/types/form-types").CalculationResult,
                formConfig
              );
              if (tempOfferData.fixedAddons && tempOfferData.fixedAddons.length > 0) {
                data.fixedAddons = tempOfferData.fixedAddons;
              }
            }
          }
          
          // Extract customer information from hash if not already set in OfferData
          // This includes phone, address, and company information
          if (data.customer) {
            // Extract phone number (always use hash value if available, even if customer.phone exists)
            if (hashFormData.phone) {
              data.customer.phone = String(hashFormData.phone);
            }
            
            // Extract address from property fields (always use hash value if available)
            const propertyStreet = hashFormData.propertyStreet as string | undefined;
            const propertyCity = hashFormData.propertyCity as string | undefined;
            const propertyZipCode = hashFormData.propertyZipCode as string | undefined;
            if (propertyStreet || propertyCity || propertyZipCode) {
              const addressParts = [
                propertyStreet,
                propertyCity,
                propertyZipCode
              ].filter(Boolean);
              if (addressParts.length > 0) {
                data.customer.address = addressParts.join(', ');
              }
            }
            
            // Extract company information if isCompany is true (always use hash value if available)
            const isCompany = hashFormData.isCompany === true || hashFormData.isCompany === 'true';
            if (isCompany) {
              const companyName = hashFormData.companyName as string | undefined;
              const companyIco = hashFormData.companyIco as string | undefined;
              const companyDic = hashFormData.companyDic as string | undefined;
              const companyStreet = hashFormData.companyStreet as string | undefined;
              const companyCity = hashFormData.companyCity as string | undefined;
              const companyZipCode = hashFormData.companyZipCode as string | undefined;
              
              if (companyName || companyIco) {
                const companyAddressParts = [
                  companyStreet,
                  companyCity,
                  companyZipCode
                ].filter(Boolean);
                
                (data.customer as Record<string, unknown>).company = {
                  name: companyName || '',
                  ico: companyIco || '',
                  dic: companyDic || '',
                  address: companyAddressParts.length > 0 ? companyAddressParts.join(', ') : ''
                };
              }
            }
          }
        }
      } catch (hashError) {
        console.error('[PDF] Failed to decode poptavkaHash:', hashError);
        // Continue anyway - hash might be invalid but we can still generate PDF
      }
    }
    
    // Generate hash for poptavka form if not already present
    if (!data.poptavkaHash) {
      // Extract customer data from the customer name and email
      const customerName = data.customer?.name || '';
      const customerEmail = data.customer?.email || '';
      
      // Parse name into firstName and lastName if possible
      const nameParts = customerName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Extract additional customer info from OfferData
      const customerAddress = data.customer?.address || '';
      const customerPhone = data.customer?.phone || '';
      
      // Determine service type from serviceTitle or use default
      // Try to extract from customer data if available (e.g., from existing hash)
      const serviceType = (data.customer as Record<string, unknown>)?.serviceType as string | undefined;
      
        // Include any additional form data that might be in the customer object
        // This will include company data, notes, serviceType, and most importantly:
        // - cleaningSupplies, zipCode, ladders fields for extra services
        // Exclude calculationResult and formConfig as they're handled separately
        // IMPORTANT: Also exclude firstName, lastName, email, phone to prevent hash expansion issues
        // These should always come from the parsed customer name/email, not from hash data
        // IMPORTANT: Extract notes and poptavkaNotes separately to preserve them correctly
        const customerDataFiltered = Object.fromEntries(
          Object.entries(data.customer as Record<string, unknown>).filter(
            ([key]) => key !== 'calculationResult' && 
                       key !== 'formConfig' && 
                       key !== 'notes' && 
                       key !== 'poptavkaNotes' &&
                       key !== 'firstName' &&
                       key !== 'lastName' &&
                       key !== 'email' &&
                       key !== 'phone'
          )
        ) as Record<string, unknown>;
        
        // Preserve notes (form note) and poptavkaNotes separately
        // IMPORTANT: data.customer.notes contains the poptavka note (passed from success-screen.tsx)
        // data.poptavkaNotes contains the poptavka note if extracted from hash
        // We need to check both sources and use the correct one
        const poptavkaNotesFromCustomer = typeof (data.customer as Record<string, unknown>)?.notes === 'string' 
          ? (data.customer as Record<string, unknown>).notes as string 
          : undefined;
        // If data.poptavkaNotes exists, use it (extracted from hash)
        // Otherwise, if customer.notes exists and it's not the form note, it might be the poptavka note
        const poptavkaNotes = data.poptavkaNotes || poptavkaNotesFromCustomer;
        // Form notes should come from data.notes (the original form note)
        const formNotes = typeof data.notes === 'string' ? data.notes : undefined;
        
        const formData = {
          // Set firstName, lastName, email, phone FIRST from parsed customer data
          // This ensures they're never overwritten by incorrectly expanded hash data
          firstName: firstName,
          lastName: lastName,
          email: customerEmail,
          phone: customerPhone,
          // Parse address into separate fields if available
          ...(customerAddress ? {
            propertyStreet: customerAddress.split(',')[0] || '',
            propertyCity: customerAddress.split(',')[1] || '',
            propertyZipCode: customerAddress.split(',')[2] || ''
          } : {}),
          // Include the start date from the PDF data to ensure consistency
          // Convert Czech date format (DD. MM. YYYY) to ISO format (YYYY-MM-DD) for hash
          serviceStartDate: (() => {
            const dateStr = data.startDate;
            // Check if it's already in ISO format
            if (dateStr.includes('-') && dateStr.length === 10) {
              return dateStr;
            }
            // Parse Czech format (DD. MM. YYYY) and convert to ISO
            const parts = dateStr.split('. ');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              return `${year}-${month}-${day}`;
            }
            return dateStr; // Fallback to original if parsing fails
          })(),
          // Include filtered customer data (without calculationResult, formConfig, notes, poptavkaNotes, firstName, lastName, email, phone)
          ...customerDataFiltered,
          // Preserve notes and poptavkaNotes separately
          ...(formNotes ? { notes: formNotes } : {}),
          ...(poptavkaNotes ? { poptavkaNotes: poptavkaNotes } : {})
        };

      // Try to preserve original calculationResult from customer data if available
      // This preserves appliedCoefficients for extra services display
      const originalCalculationResult = (data.customer as Record<string, unknown>)?.calculationResult as import("@/types/form-types").CalculationResult | undefined;
      
      const hashData = buildPoptavkaHashData({
        serviceTitle: data.serviceTitle || 'Ostatní služby',
        totalPrice: data.price,
        serviceType: serviceType || (data.customer as Record<string, unknown>)?.serviceType as string | undefined,
        calculationResult: originalCalculationResult || {
          regularCleaningPrice: 0,
          generalCleaningPrice: data.generalCleaningPrice || 0,
          generalCleaningFrequency: data.generalCleaningFrequency,
          totalMonthlyPrice: data.price,
          hourlyRate: data.hourlyRate,
          orderId: (data.customer as Record<string, unknown>)?.orderId as string | undefined || undefined,
          calculationDetails: {
            basePrice: 0,
            appliedCoefficients: data.fixedAddons?.map(addon => ({
              field: addon.label.toLowerCase().includes('doprava') ? 'zipCode' : 
                     addon.label.toLowerCase().includes('úklidové náčiní') ? 'cleaningSupplies' : 'other',
              label: addon.label,
              coefficient: 1,
              impact: addon.amount
            })) || [],
            finalCoefficient: 1
          }
        },
        formData,
        formConfig: (data.customer as Record<string, unknown>)?.formConfig as import("@/types/form-types").FormConfig | undefined
      });
      
      // Generate hash and validate it can be decoded
      try {
        data.poptavkaHash = hashService.generateHash(hashData);
        // Verify the hash can be decoded
        const decoded = hashService.decodeHash(data.poptavkaHash);
        if (!decoded) {
          console.error('[PDF] Failed to decode generated hash:', JSON.stringify(hashData, null, 2));
          throw new Error('Generated hash cannot be decoded');
        }
      } catch (error) {
        console.error('[PDF] Error generating hash:', error);
        console.error('[PDF] Hash data:', JSON.stringify(hashData, null, 2));
        throw error;
      }
    }
    
    // Determine base URL for links - use environment variable or fallback to production URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://handyhands-calculator.vercel.app';
    const htmlBody = renderOfferPdfBody(data, baseUrl);

  const cssPath = path.join(process.cwd(), "dist", "pdf.css");
  const css = await fs.readFile(cssPath, "utf8").catch(() => "");

  // Convert images to base64 data URLs (solution from Stack Overflow)
  const publicPath = path.join(process.cwd(), 'public');
  
  // Read image files and convert to base64
  const logoBase64 = await fs.readFile(path.join(publicPath, 'handyhands_horizontal.svg'), 'base64');
  const signatureLenkaBase64 = await fs.readFile(path.join(publicPath, 'signature-lenka.svg'), 'base64');
  const signatureJanaBase64 = await fs.readFile(path.join(publicPath, 'signature-jana.svg'), 'base64');
  const moneyTimeBase64 = await fs.readFile(path.join(publicPath, 'money-time.svg'), 'base64').catch(() => '');
  const calendarBase64 = await fs.readFile(path.join(publicPath, 'calendar.svg'), 'base64').catch(() => '');
  
  // Replace image sources with base64 data URLs
  const htmlBodyWithBase64 = htmlBody
    .replace(/src="handyhands_horizontal\.svg"/g, `src="data:image/svg+xml;base64,${logoBase64}"`)
    .replace(/src="signature-lenka\.svg"/g, `src="data:image/svg+xml;base64,${signatureLenkaBase64}"`)
    .replace(/src="signature-jana\.svg"/g, `src="data:image/svg+xml;base64,${signatureJanaBase64}"`)
    .replace(/src="money-time\.svg"/g, moneyTimeBase64 ? `src="data:image/svg+xml;base64,${moneyTimeBase64}"` : 'src="money-time.svg"')
    .replace(/src="calendar\.svg"/g, calendarBase64 ? `src="data:image/svg+xml;base64,${calendarBase64}"` : 'src="calendar.svg"');

  const pageHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:30mm 18mm 20mm 18mm} ${css}</style></head><body class="font-sans text-sm">${htmlBodyWithBase64}</body></html>`;

  // Launch serverless-compatible Chromium on Vercel
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: null,
    executablePath: executablePath || undefined,
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.setContent(pageHtml, { waitUntil: "networkidle0" });
  
  // Load header and footer templates and apply base64 replacements
  const headerTemplateRaw = await fs.readFile(path.join(process.cwd(), 'src/pdf/templates/header.html'), 'utf8');
  const footerTemplateRaw = await fs.readFile(path.join(process.cwd(), 'src/pdf/templates/footer.html'), 'utf8');
  
  const headerTemplate = headerTemplateRaw
    .replace(/src="handyhands_horizontal\.svg"/g, `src="data:image/svg+xml;base64,${logoBase64}"`);
  
  const footerTemplate = footerTemplateRaw; // No images in footer currently
  
  const pdf = await page.pdf({ 
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: {
      top: '30mm',
      bottom: '20mm',
      left: '18mm',
      right: '18mm'
    }
  });
  await browser.close();


  // Store the PDF URL for potential return
  let uploadedPdfUrl = '';
  let uploadError: Error | null = null;
  
  // Upload to Google Drive if tokens are available (server-side only via environment variables)
  const isPoptavka = data.isPoptavka;
  const { getTokensFromEnv } = await import("@/utils/google-drive");
  const tokens = getTokensFromEnv();
  const parentFolderId = process.env.GDRIVE_PARENT_FOLDER_ID;
  const poptavkyFolderId = process.env.GDRIVE_FINAL_OFFER_FOLDER_ID;
  
  // Log upload conditions for debugging
  console.log('[PDF] PDF Upload conditions:', {
    isPoptavka,
    hasTokens: !!tokens,
    hasParentFolderId: !!parentFolderId,
    hasPoptavkyFolderId: !!poptavkyFolderId,
    shouldUpload: tokens && (parentFolderId || (isPoptavka && poptavkyFolderId))
  });
  
  // Refresh tokens if needed (for both Drive upload and Sheets write)
  let validTokens = tokens;
  if (tokens && tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
    try {
      console.log('[PDF] Access token expired, attempting to refresh...');
      const { getOAuthClient } = await import("@/utils/google-drive");
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials(tokens);
      // Type assertion needed because our minimal types don't include all methods
      const oauthClientWithRefresh = oauth2Client as typeof oauth2Client & {
        refreshAccessToken: () => Promise<{ 
          credentials: { 
            access_token?: string; 
            refresh_token?: string; 
            expiry_date?: number; 
            token_type?: string; 
            scope?: string;
          } 
        }>;
      };
      const { credentials } = await oauthClientWithRefresh.refreshAccessToken();
      // Ensure we have an access_token before assigning
      if (credentials.access_token && validTokens) {
        validTokens = {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || validTokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type || "Bearer",
          scope: credentials.scope,
        };
        console.log('[PDF] Tokens refreshed successfully');
      }
    } catch (refreshError) {
      console.error('[PDF] Failed to refresh tokens:', refreshError);
      // Continue with original tokens - might still work
    }
  }
  
  if (validTokens && (parentFolderId || (isPoptavka && poptavkyFolderId))) {
    try {
      const customer = data.customer?.name || "zakaznik";
      const email = data.customer?.email || "bez-emailu";
      const serviceTitle = data.serviceTitle || "Ostatní";
      const date = new Date().toLocaleDateString("cs-CZ").replace(/\//g, "-");
      const suffix = isPoptavka ? "_poptavka" : "";
      const filename = `${serviceTitle.replace(/\s+/g, "_")}_${customer.replace(/\s+/g, "_")}_${email}_${date}${suffix}`;
      const subfolder = serviceTitle;
      
      console.log('[PDF] Uploading PDF to Google Drive:', {
        filename,
        subfolder,
        parentFolderId: isPoptavka ? poptavkyFolderId : parentFolderId
      });
      
      const result = await uploadPdfToDrive({
        tokens: validTokens,
        parentFolderId: isPoptavka ? poptavkyFolderId! : parentFolderId!,
        subfolderName: subfolder,
        filename,
        pdfBuffer: pdf,
      });
      
      uploadedPdfUrl = `https://drive.google.com/file/d/${result.fileId}/view`;
      console.log('[PDF] PDF uploaded successfully to Google Drive:', uploadedPdfUrl);
      if (data.customer?.email) {
        try {
          console.log('[PDF] Sending transactional email with PDF attachment...');
          const { sendTransactionalEmail, createPdfAttachment } = await import('@/utils/ecomail-transactional');
          
          // Use different template IDs: 2 for poptavka, 3 for regular PDF download
          const templateId = isPoptavka ? 2 : 3;
          
          // Set subject based on template/context
          const emailSubject = isPoptavka 
            ? 'Návrh smlouvy a zahájení spolupráce s Handy Hands'  // Template 2: Poptávka
            : 'Vaše kalkulace úklidových služeb Handy Hands';       // Template 3: Regular PDF

          const poptavkaUrl = data.poptavkaHash
            ? hashService.createPoptavkaUrl(data.poptavkaHash, baseUrl)
            : '';
          
          const emailResult = await sendTransactionalEmail({
            to: [{
              email: data.customer.email,
              name: data.customer.name || undefined,
            }],
            subject: emailSubject,
            fromName: 'Handy Hands',
            fromEmail: process.env.ECOMAIL_FROM_EMAIL || 'info@handyhands.cz',
            templateId,
            attachments: [
              createPdfAttachment(pdf, `${filename}.pdf`)
            ],
            globalMergeVars: [
              { name: 'POPTAVKA_URL', content: poptavkaUrl },
              { name: 'PDF_OBJEDNAVKA', content: uploadedPdfUrl || '' },
            ],
          });
          
          if (emailResult.success) {
            console.log(`[PDF] Transactional email sent successfully (template ${templateId}):`, emailResult.messageId);
          } else {
            console.error('[PDF] Failed to send transactional email:', emailResult.error);
            // Don't fail the request if email fails, but log it
          }
        } catch (emailError) {
          console.error('[PDF] Error sending transactional email:', emailError);
          // Don't fail the request if email fails
        }
      }
    } catch (err) {
      uploadError = err instanceof Error ? err : new Error(String(err));
      console.error('[PDF] Failed to upload to Google Drive:', uploadError);
      console.error('[PDF] Upload error stack:', uploadError.stack);
      // Don't fail the request if upload fails, but log it clearly
    }
  } else {
    const missingItems: string[] = [];
    if (!tokens) {
      missingItems.push('Google Drive OAuth tokens (complete OAuth flow at /api/google/oauth/init and set GOOGLE_ACCESS_TOKEN env var)');
    }
    if (isPoptavka && !poptavkyFolderId) {
      missingItems.push('GDRIVE_FINAL_OFFER_FOLDER_ID environment variable');
    }
    if (!isPoptavka && !parentFolderId) {
      missingItems.push('GDRIVE_PARENT_FOLDER_ID environment variable');
    }
    
    console.warn('[PDF] PDF upload skipped - missing requirements:', {
      hasAccessToken: !!process.env.GOOGLE_ACCESS_TOKEN,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      parentFolderId: !!parentFolderId,
      poptavkyFolderId: !!poptavkyFolderId,
      isPoptavka,
      missingItems
    });
    
    uploadError = new Error(`PDF upload skipped: ${missingItems.join(', ')}`);
  }

  // Write submission data to Google Sheets using Service Account (runs regardless of upload status)
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const hasServiceAccount = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
  
  if (spreadsheetId && hasServiceAccount) {
    try {
      console.log('[PDF] Writing submission data to Google Sheets...');
      const { writeToGoogleSheets } = await import('@/utils/google-sheets');
      await writeToGoogleSheets({
        spreadsheetId,
        offerData: data,
        isPoptavka: isPoptavka ?? false,
      });
      console.log('[PDF] Successfully wrote data to Google Sheets');
    } catch (sheetsError) {
      console.error('[PDF] Failed to write to Google Sheets:', sheetsError);
      // Don't fail the request if Google Sheets write fails, but log it
    }
  } else {
    if (!spreadsheetId) {
      console.warn('[PDF] Google Sheets write skipped - GOOGLE_SHEET_ID environment variable not set');
    } else if (!hasServiceAccount) {
      console.warn('[PDF] Google Sheets write skipped - GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY not set');
    }
  }

  // If this is a poptavka submission, return JSON with PDF URL
  if (isPoptavka) {
    return NextResponse.json({
      success: true,
      pdfUrl: uploadedPdfUrl,
      message: uploadedPdfUrl 
        ? 'PDF generated and uploaded successfully' 
        : 'PDF generated but upload to Google Drive failed or was skipped',
      uploadError: uploadError ? uploadError.message : undefined
    });
  }

  // For regular PDF downloads, return the PDF blob with Google Drive URL in headers
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline; filename=handyhands-nabidka.pdf",
  };
  
  // Add Google Drive URL to headers if available
  if (uploadedPdfUrl) {
    headers["X-PDF-URL"] = uploadedPdfUrl;
  }
  
  // Also add upload error info in header for debugging (if upload failed)
  if (uploadError) {
    headers["X-PDF-Upload-Error"] = uploadError.message;
  }

  return new NextResponse(pdf as BodyInit, { headers });
  } catch (error) {
    console.error('[PDF] PDF generation error:', error);
    console.error('[PDF] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const preview = url.searchParams.get('preview');
  
  const demo: OfferData = {
    quoteDate: new Date().toLocaleDateString("cs-CZ"),
    price: 4060,
    startDate: new Date(Date.now() + 10 * 86400000).toLocaleDateString("cs-CZ"),
    customer: { name: "Ing. Petr Jančálek", address: "Hvězdova 1566/21, 14000 Praha, CZ", email: "p.jancalek@email.cz", phone: "+420 605 827 609" },
    company: { name: "HandyHands, s.r.o.", address: "Praha 4, Hvězdova 13/2, PSČ 14078", ico: "49240901", registerInfo: "v obchodním rejstříku vedeném Městským soudem v Praze, oddíl B, vložka 2051", email: "info@handyhands.cz", phone: "+420 412 440 000" },
    tasks: [
      "Pravidelný úklid činžovního domu, novostavby",
      "četnost úklidu domu 1x týdně",
      "orientační počet oken na patře 5",
      "výtah v domě ano",
      "četnost úklidu v suterénních patrech 2x ročně",
      "počet podzemních pater v domě 1",
      "převládající typ oken plastová",
      "požadavek generálního úklid domu ano",
      "počet nadzemních pater v domě včetně přízemí 4",
      "počet pater, kde jsou okna 4",
      "teplá voda v úklidové místnosti (nebo jinde v domě pro potřeby úklidu) ne",
      "lokalita prováděných úklidových prací (PSČ) 110 00",
      "orientační počet bytů na patře 3",
      "některá okna hůře dostupná z podlahy nebo fixní (nutno použít např. štafle nebo teleskopické tyče) ne",
      "generální úklid domu 2x ročně"
    ],
    summaryItems: [
      { label: "Typ nemovitosti", value: "Bytový dům" },
      { label: "Frekvence úklidu", value: "Týdně" },
      { label: "Počet pater", value: "4" },
      { label: "Počet bytů na patře", value: "3" },
    ],
    notes: "Prosím o důkladný úklid schodišť a výtahu. Děkuji za profesionální služby.",
    conditions: [
      "Dostupnost alespoň studené vody v domě",
      "Uzamykatelná místnost nebo uzamykatelná část domu (místo) na úklidové náčiní a úklidovou chemii"
    ],
    commonServices: {
      weekly: [
        "zametání a mytí schodů, podest a chodeb ve všech patrech domu včetně přízemí",
        "otírání madel zábradlí a okenních parapetů",
        "schody do suterénu",
        "hrubý úklid dvorku",
        "oboustranné mytí skleněných vchodových dveří od otisků prstů a odstranění letáků"
      ],
      monthly: [
        "odstranění reklam",
        "vysmýčení pavučin"
      ],
      biAnnual: [
        "zametení v suterénu domu",
        "umytí všech otevíravých částí oken včetně rámů",
        "očištění osvětlení zvenčí",
        "mytí zábradlí",
        "umytí nadsvětlíků u vchodových dveří",
        "setření prachu z hydrantů, schránek, vypínačů a tech. rozvodů"
      ]
    }
  };

  // If preview=true, return HTML instead of PDF
  if (preview === 'true') {
    // Determine base URL for links - use environment variable or fallback to production URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://handyhands-calculator.vercel.app';
    const htmlBody = renderOfferPdfBody(demo, baseUrl);
    const cssPath = path.join(process.cwd(), "dist", "pdf.css");
    const css = await fs.readFile(cssPath, "utf8").catch(() => "");
    
    const publicPath = path.join(process.cwd(), 'public');
    
    // Read image files and convert to base64
    const logoBase64 = await fs.readFile(path.join(publicPath, 'handyhands_horizontal.svg'), 'base64');
    const signatureLenkaBase64 = await fs.readFile(path.join(publicPath, 'signature-lenka.svg'), 'base64');
    const signatureJanaBase64 = await fs.readFile(path.join(publicPath, 'signature-jana.svg'), 'base64');
    const moneyTimeBase64 = await fs.readFile(path.join(publicPath, 'money-time.svg'), 'base64').catch(() => '');
    const calendarBase64 = await fs.readFile(path.join(publicPath, 'calendar.svg'), 'base64').catch(() => '');
    
    // Replace image sources with base64 data URLs
    const htmlBodyWithBase64 = htmlBody
      .replace(/src="handyhands_horizontal\.svg"/g, `src="data:image/svg+xml;base64,${logoBase64}"`)
      .replace(/src="signature-lenka\.svg"/g, `src="data:image/svg+xml;base64,${signatureLenkaBase64}"`)
      .replace(/src="signature-jana\.svg"/g, `src="data:image/svg+xml;base64,${signatureJanaBase64}"`)
      .replace(/src="money-time\.svg"/g, moneyTimeBase64 ? `src="data:image/svg+xml;base64,${moneyTimeBase64}"` : 'src="money-time.svg"')
      .replace(/src="calendar\.svg"/g, calendarBase64 ? `src="data:image/svg+xml;base64,${calendarBase64}"` : 'src="calendar.svg"');

    const pageHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:30mm 18mm 20mm 18mm} ${css}</style></head><body class="font-sans text-sm">${htmlBodyWithBase64}</body></html>`;
    
    return new NextResponse(pageHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  const postReq = new NextRequest("http://localhost", { method: "POST", body: JSON.stringify(demo) });
  return POST(postReq);
}


