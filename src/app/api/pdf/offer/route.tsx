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
      
      // Build form data for hash
      const formData = {
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
        serviceStartDate: data.startDate,
        // Include any additional form data that might be in the customer object
        // This will include company data, notes, etc. from the enhanced customer data
        ...(data.customer as Record<string, unknown>)
      };

      const hashData = buildPoptavkaHashData({
        serviceTitle: data.serviceTitle || 'Ostatní služby',
        totalPrice: data.price,
        calculationResult: {
          regularCleaningPrice: 0,
          generalCleaningPrice: 0,
          totalMonthlyPrice: data.price,
          calculationDetails: {
            basePrice: 0,
            appliedCoefficients: [],
            finalCoefficient: 1
          }
        },
        formData
      });
      
      data.poptavkaHash = hashService.generateHash(hashData);
    }
    
    // Determine base URL for links - use environment variable or fallback to production URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
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
  
  // Upload to Google Drive if tokens are available
  const isPoptavka = data.isPoptavka;
  const tokensCookie = req.cookies.get("gg_tokens")?.value;
  const parentFolderId = process.env.GDRIVE_PARENT_FOLDER_ID;
  const poptavkyFolderId = process.env.GDRIVE_FINAL_OFFER_FOLDER_ID;
  if (tokensCookie && (parentFolderId || (isPoptavka && poptavkyFolderId))) {
    try {
      const tokens = JSON.parse(tokensCookie);
      const customer = data.customer?.name || "zakaznik";
      const email = data.customer?.email || "bez-emailu";
      const serviceTitle = data.serviceTitle || "Ostatní";
      const date = new Date().toLocaleDateString("cs-CZ").replace(/\//g, "-");
      const suffix = isPoptavka ? "_poptavka" : "";
      const filename = `${serviceTitle.replace(/\s+/g, "_")}_${customer.replace(/\s+/g, "_")}_${email}_${date}${suffix}`;
      const subfolder = serviceTitle;
      
      const result = await uploadPdfToDrive({
        tokens,
        parentFolderId: isPoptavka ? poptavkyFolderId! : parentFolderId!,
        subfolderName: subfolder,
        filename,
        pdfBuffer: pdf,
      });
      
      uploadedPdfUrl = `https://drive.google.com/file/d/${result.fileId}/view`;
    } catch (uploadError) {
      console.error('Failed to upload to Google Drive:', uploadError);
    }
  }

  // If this is a poptavka submission, return JSON with PDF URL
  if (isPoptavka) {
    return NextResponse.json({
      success: true,
      pdfUrl: uploadedPdfUrl,
      message: 'PDF generated and uploaded successfully'
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

  return new NextResponse(pdf as BodyInit, { headers });
  } catch (error) {
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


