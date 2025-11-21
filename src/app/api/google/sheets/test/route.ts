import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_SHEET_ID environment variable not set",
      }, { status: 400 });
    }

    if (!clientEmail || !privateKey) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required",
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      }, { status: 400 });
    }

    // Test spreadsheet access using Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

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
      };
    };

    const sheetsApi = sheets as unknown as SheetsApiType;
    
    const spreadsheetInfo = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId,properties.title,sheets.properties.title,sheets.properties.sheetId',
    });

    const availableSheets = spreadsheetInfo.data.sheets?.map((s) => s.properties?.title) || [];
    const dataSheetExists = availableSheets.includes('Data');

    return NextResponse.json({
      success: true,
      spreadsheet: {
        id: spreadsheetInfo.data.spreadsheetId,
        title: spreadsheetInfo.data.properties?.title,
        availableSheets,
        dataSheetExists,
      },
      serviceAccount: {
        email: clientEmail,
        hasPrivateKey: !!privateKey,
      },
      message: dataSheetExists 
        ? '✓ Spreadsheet access verified. "Data" sheet found.'
        : `⚠ Spreadsheet accessible but "Data" sheet not found. Available sheets: ${availableSheets.join(', ') || 'none'}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404 = errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND');
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      spreadsheetId: process.env.GOOGLE_SHEET_ID || 'NOT SET',
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      suggestion: is404 
        ? '1) Verify GOOGLE_SHEET_ID is correct (from URL: docs.google.com/spreadsheets/d/SPREADSHEET_ID/...), 2) Ensure service account email (GOOGLE_CLIENT_EMAIL) has edit access to the spreadsheet, 3) Verify GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set correctly'
        : 'Check error message above',
    }, { status: 500 });
  }
}

