import { NextRequest, NextResponse } from "next/server";
import {
  readGoogleDoc,
  cloneGoogleDoc,
  modifyGoogleDoc,
  replaceTextInGoogleDoc,
} from "@/utils/google-docs";

export const dynamic = "force-dynamic";

/**
 * GET /api/google/docs
 * Read a Google Docs document
 * Query params:
 *   - documentId: The ID of the document to read
 *   - type: Optional type selector ('residential' or 'commercial')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const type = searchParams.get("type");

    // If type is provided, use predefined document IDs
    let targetDocumentId: string | null = documentId;
    if (!targetDocumentId && type) {
      if (type === "residential") {
        targetDocumentId = process.env.GOOGLE_DOC_RESIDENTIAL_ID || null;
      } else if (type === "commercial") {
        targetDocumentId = process.env.GOOGLE_DOC_COMMERCIAL_ID || null;
      }
    }

    if (!targetDocumentId) {
      return NextResponse.json(
        {
          success: false,
          error: "documentId query parameter or type ('residential' or 'commercial') is required",
        },
        { status: 400 }
      );
    }

    const result = await readGoogleDoc(targetDocumentId);

    return NextResponse.json({
      success: true,
      document: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404 =
      errorMessage.includes("404") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("NOT_FOUND");

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        suggestion: is404
          ? "1) Verify documentId is correct, 2) Ensure service account email (GOOGLE_CLIENT_EMAIL) has access to the document, 3) Verify GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set correctly"
          : "Check error message above",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/google/docs
 * Clone or modify a Google Docs document
 * Body:
 *   - action: 'clone' | 'modify' | 'replace'
 *   - documentId: The ID of the document (or use 'type' for predefined)
 *   - type: Optional type selector ('residential' or 'commercial')
 *   - newName: (for clone) Name for the cloned document
 *   - requests: (for modify) Array of modification requests
 *   - findText: (for replace) Text to find
 *   - replaceText: (for replace) Text to replace with
 *   - matchCase: (for replace) Whether to match case
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, documentId, type, newName, requests, findText, replaceText, matchCase } = body;

    if (!action || !["clone", "modify", "replace"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "action is required and must be 'clone', 'modify', or 'replace'",
        },
        { status: 400 }
      );
    }

    // Determine target document ID
    let targetDocumentId: string | null = documentId || null;
    if (!targetDocumentId && type) {
      if (type === "residential") {
        targetDocumentId = process.env.GOOGLE_DOC_RESIDENTIAL_ID || null;
      } else if (type === "commercial") {
        targetDocumentId = process.env.GOOGLE_DOC_COMMERCIAL_ID || null;
      }
    }

    if (!targetDocumentId) {
      return NextResponse.json(
        {
          success: false,
          error: "documentId or type ('residential' or 'commercial') is required",
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "clone":
        result = await cloneGoogleDoc(targetDocumentId, newName);
        return NextResponse.json({
          success: true,
          action: "clone",
          result,
        });

      case "modify":
        if (!requests || !Array.isArray(requests)) {
          return NextResponse.json(
            {
              success: false,
              error: "requests array is required for modify action",
            },
            { status: 400 }
          );
        }
        result = await modifyGoogleDoc(targetDocumentId, requests);
        return NextResponse.json({
          success: true,
          action: "modify",
          result,
        });

      case "replace":
        if (!findText || !replaceText) {
          return NextResponse.json(
            {
              success: false,
              error: "findText and replaceText are required for replace action",
            },
            { status: 400 }
          );
        }
        result = await replaceTextInGoogleDoc(
          targetDocumentId,
          findText,
          replaceText,
          matchCase || false
        );
        return NextResponse.json({
          success: true,
          action: "replace",
          result,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404 =
      errorMessage.includes("404") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("NOT_FOUND");

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        suggestion: is404
          ? "1) Verify documentId is correct, 2) Ensure service account email (GOOGLE_CLIENT_EMAIL) has edit access to the document, 3) Verify GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set correctly"
          : "Check error message above",
      },
      { status: 500 }
    );
  }
}

