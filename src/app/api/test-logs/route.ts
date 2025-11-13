import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint to verify logging works in Vercel
 * GET /api/test-logs
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  try {
    // Test all log levels
    logger.log('Test log message', { test: 'data' }, { prefix: 'TEST' });
    logger.info('Test info message', { info: 'data' }, { prefix: 'TEST' });
    logger.warn('Test warning message', { warning: 'data' }, { prefix: 'TEST' });
    logger.error('Test error message', new Error('Test error'), { prefix: 'TEST' });
    
    // Also test direct console calls
    console.log('[DIRECT] Direct console.log test');
    console.warn('[DIRECT] Direct console.warn test');
    console.error('[DIRECT] Direct console.error test');
    
    // Test API logging
    logger.apiRequest('GET', '/api/test-logs', { query: 'test' });
    logger.apiResponse('GET', '/api/test-logs', 200, { success: true });
    
    return NextResponse.json({
      success: true,
      message: 'Logs sent! Check Vercel Runtime Logs in the dashboard.',
      instructions: [
        '1. Go to Vercel Dashboard → Your Project → Logs tab',
        '2. Filter by Function: api/test-logs',
        '3. Or search for "TEST" or "DIRECT"',
        '4. You should see all log messages above'
      ]
    });
  } catch (error) {
    logger.error('Test logs endpoint error:', error, { prefix: 'TEST' });
    return NextResponse.json(
      { error: 'Failed to test logs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

