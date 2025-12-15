import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient, getTokensFromEnv } from "@/utils/google-drive";

export const dynamic = "force-dynamic";

/**
 * Comprehensive test endpoint to diagnose OAuth permissions and access
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId") || process.env.GOOGLE_DOC_RESIDENTIAL_ID;
    const folderId = searchParams.get("folderId") || process.env.GDRIVE_CONTRACT_FOLDER_ID;

    const results: Record<string, unknown> & {
      copyTest?: {
        success?: boolean;
        copiedDocumentId?: string;
        copiedDocumentName?: string;
        message?: string;
        cleanedUp?: boolean;
        cleanupError?: string;
        error?: string;
        statusCode?: number;
        errorDetails?: unknown;
        isQuotaError?: boolean;
        is403?: boolean;
        is404?: boolean;
        skipped?: boolean;
        reason?: string;
      };
    } = {};

    // Test 1: Check if OAuth tokens exist
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    
    results.oauthTokens = {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    };

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_ACCESS_TOKEN not set",
        results,
      }, { status: 400 });
    }

    // Test 2: Initialize OAuth client and get token info
    try {
      const oauth2Client = getOAuthClient();
      const tokens = getTokensFromEnv();
      
      if (!tokens) {
        return NextResponse.json({
          success: false,
          error: "Failed to get OAuth tokens from environment",
          results,
        }, { status: 400 });
      }

      oauth2Client.setCredentials(tokens);

      // Get token info to check scopes using Google OAuth2 API
      try {
        // Use direct API call to Google's tokeninfo endpoint
        const tokenInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/tokeninfo?access_token=${encodeURIComponent(tokens.access_token)}`
        );
        
        if (!tokenInfoResponse.ok) {
          throw new Error(`Token info API returned ${tokenInfoResponse.status}`);
        }
        
        const tokenInfo = await tokenInfoResponse.json() as {
          email?: string;
          scope?: string;
          expires_in?: number;
        };
        
        const scopes = tokenInfo.scope?.split(' ') || [];
        results.tokenInfo = {
          email: tokenInfo.email || 'unknown',
          scopes,
          expiresIn: tokenInfo.expires_in ? new Date(Date.now() + tokenInfo.expires_in * 1000).toISOString() : 'unknown',
          hasDocumentsScope: scopes.includes('https://www.googleapis.com/auth/documents'),
          hasDriveScope: scopes.includes('https://www.googleapis.com/auth/drive'),
          hasDriveFileScope: scopes.includes('https://www.googleapis.com/auth/drive.file'),
        };
        console.log('[Test] Token info:', results.tokenInfo);
      } catch (tokenInfoError) {
        results.tokenInfoError = tokenInfoError instanceof Error ? tokenInfoError.message : String(tokenInfoError);
        console.error('[Test] Failed to get token info:', tokenInfoError);
      }

      // Test 3: Check storage quota
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      type DriveApiType = {
        about: {
          get: (options: { fields: string }) => Promise<{ data: { storageQuota?: { limit?: string; usage?: string; usageInDrive?: string; usageInDriveTrash?: string } } }>;
        };
        files: {
          get: (options: { fileId: string; fields?: string }) => Promise<{ data: { id?: string; name?: string; owners?: Array<{ emailAddress?: string }>; mimeType?: string } }>;
          copy: (options: {
            fileId: string;
            requestBody: { name?: string; parents?: string[] };
          }) => Promise<{ data: { id?: string; name?: string } }>;
        };
      };

      const driveApi = drive as unknown as DriveApiType;

      try {
        const about = await driveApi.about.get({
          fields: 'storageQuota',
        });
        results.storageQuota = about.data.storageQuota || 'Not available';
        console.log('[Test] Storage quota:', about.data.storageQuota);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.storageQuotaError = errorMsg;
        console.error('[Test] Failed to get storage quota:', errorMsg);
      }

      // Test 4: Try to read the template document
      if (documentId) {
        try {
          const fileInfo = await driveApi.files.get({
            fileId: documentId,
            fields: 'id,name,owners,mimeType',
          });
          results.documentAccess = {
            success: true,
            id: fileInfo.data.id,
            name: fileInfo.data.name,
            mimeType: fileInfo.data.mimeType,
            owners: fileInfo.data.owners?.map(o => o.emailAddress),
            isGoogleDoc: fileInfo.data.mimeType === 'application/vnd.google-apps.document',
          };
          console.log('[Test] Document access successful:', fileInfo.data.name);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorDetails = error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: unknown; status?: number } }).response
            : null;
          results.documentAccess = {
            success: false,
            error: errorMsg,
            statusCode: errorDetails?.status,
            errorDetails: errorDetails?.data,
            is404: errorMsg.includes('404') || errorMsg.includes('not found'),
            is403: errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('Forbidden'),
          };
          console.error('[Test] Failed to access document:', errorMsg);
        }
      }

      // Test 5: Try to access the folder
      if (folderId) {
        try {
          const folderInfo = await driveApi.files.get({
            fileId: folderId,
            fields: 'id,name,owners,mimeType',
          });
          results.folderAccess = {
            success: true,
            id: folderInfo.data.id,
            name: folderInfo.data.name,
            mimeType: folderInfo.data.mimeType,
            owners: folderInfo.data.owners?.map(o => o.emailAddress),
            isFolder: folderInfo.data.mimeType === 'application/vnd.google-apps.folder',
          };
          console.log('[Test] Folder access successful:', folderInfo.data.name);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorDetails = error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: unknown; status?: number } }).response
            : null;
          results.folderAccess = {
            success: false,
            error: errorMsg,
            statusCode: errorDetails?.status,
            errorDetails: errorDetails?.data,
            is404: errorMsg.includes('404') || errorMsg.includes('not found'),
            is403: errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('Forbidden'),
          };
          console.error('[Test] Failed to access folder:', errorMsg);
        }
      }

      // Test 6: Try to copy the document (if both document and folder are accessible)
      if (documentId && folderId && results.documentAccess && (results.documentAccess as { success: boolean }).success && 
          results.folderAccess && (results.folderAccess as { success: boolean }).success) {
        try {
          const testCopyName = `TEST_COPY_${Date.now()}`;
          const copiedFile = await driveApi.files.copy({
            fileId: documentId,
            requestBody: {
              name: testCopyName,
              parents: [folderId],
            },
          });

          if (copiedFile.data.id) {
            results.copyTest = {
              success: true,
              copiedDocumentId: copiedFile.data.id,
              copiedDocumentName: copiedFile.data.name,
              message: 'Successfully created test copy',
            };
            console.log('[Test] Copy test successful:', copiedFile.data.id);

            // Clean up: delete the test copy
            try {
              await (driveApi.files as unknown as { delete: (options: { fileId: string }) => Promise<void> }).delete({
                fileId: copiedFile.data.id,
              });
              results.copyTest.cleanedUp = true;
              console.log('[Test] Test copy cleaned up');
            } catch (cleanupError) {
              results.copyTest.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
              console.warn('[Test] Failed to clean up test copy:', cleanupError);
            }
          } else {
            results.copyTest = {
              success: false,
              error: 'No ID returned from copy operation',
            };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorDetails = error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: unknown; status?: number } }).response
            : null;
          
          results.copyTest = {
            success: false,
            error: errorMsg,
            statusCode: errorDetails?.status,
            errorDetails: errorDetails?.data,
            isQuotaError: errorMsg.includes('quota') || errorMsg.includes('storage'),
            is403: errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('Forbidden'),
            is404: errorMsg.includes('404') || errorMsg.includes('not found'),
          };
          console.error('[Test] Copy test failed:', errorMsg);
          console.error('[Test] Error details:', JSON.stringify(errorDetails, null, 2));
        }
      } else {
        results.copyTest = {
          skipped: true,
          reason: 'Document or folder not accessible, skipping copy test',
        };
      }

      // Test 7: Try to use Google Docs API to read document
      if (documentId) {
        try {
          const docs = google.docs({ version: 'v1', auth: oauth2Client });
          type DocsApiType = {
            documents: {
              get: (options: { documentId: string }) => Promise<{
                data: {
                  documentId?: string;
                  title?: string;
                };
              }>;
            };
          };
          const docsApi = docs as unknown as DocsApiType;
          
          const doc = await docsApi.documents.get({ documentId });
          results.docsApiAccess = {
            success: true,
            documentId: doc.data.documentId,
            title: doc.data.title,
          };
          console.log('[Test] Docs API access successful:', doc.data.title);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorDetails = error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: unknown; status?: number } }).response
            : null;
          results.docsApiAccess = {
            success: false,
            error: errorMsg,
            statusCode: errorDetails?.status,
            errorDetails: errorDetails?.data,
          };
          console.error('[Test] Docs API access failed:', errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.oauthClientError = errorMsg;
      console.error('[Test] Failed to initialize OAuth client:', errorMsg);
    }

    return NextResponse.json({
      success: true,
      tests: results,
      recommendations: generateRecommendations(results),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(results: Record<string, unknown>): string[] {
  const recommendations: string[] = [];
  
  const tokenInfo = results.tokenInfo as { scopes?: string[]; hasDocumentsScope?: boolean; hasDriveScope?: boolean } | undefined;
  
  if (!tokenInfo?.hasDocumentsScope) {
    recommendations.push('Missing scope: https://www.googleapis.com/auth/documents - Reinit OAuth at /api/google/oauth/init');
  }
  
  if (!tokenInfo?.hasDriveScope) {
    recommendations.push('Missing scope: https://www.googleapis.com/auth/drive - Reinit OAuth at /api/google/oauth/init');
  }
  
  const documentAccess = results.documentAccess as { success?: boolean; is404?: boolean; is403?: boolean } | undefined;
  if (documentAccess && !documentAccess.success) {
    if (documentAccess.is404) {
      recommendations.push('Template document not found or not shared - Share document with OAuth account email with "Editor" permissions');
    } else if (documentAccess.is403) {
      recommendations.push('Template document access denied - Share document with OAuth account email with "Editor" permissions');
    }
  }
  
  const folderAccess = results.folderAccess as { success?: boolean; is404?: boolean; is403?: boolean } | undefined;
  if (folderAccess && !folderAccess.success) {
    if (folderAccess.is404) {
      recommendations.push('Destination folder not found or not shared - Share folder with OAuth account email with "Editor" permissions');
    } else if (folderAccess.is403) {
      recommendations.push('Destination folder access denied - Share folder with OAuth account email with "Editor" permissions');
    }
  }
  
  return recommendations;
}

