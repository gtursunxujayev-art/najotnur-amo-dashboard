import { NextRequest, NextResponse } from 'next/server';
import { syncOnlinePBXCalls, testOnlinePBXConnection } from '@/lib/onlinepbxApi';
import { getTodayStartGMT5, getTodayEndGMT5, getYesterdayRangeGMT5 } from '@/lib/timezoneGMT5';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const testOnly = searchParams.get('test') === 'true';

    if (testOnly) {
      console.log('[OnlinePBX/Sync] Testing connection...');
      try {
        const connected = await testOnlinePBXConnection();
        return NextResponse.json({
          success: connected,
          message: connected ? 'Connection successful' : 'Connection failed',
          hint: connected ? undefined : 'Please verify ONLINEPBX_API_KEY is valid and not expired. You may need to regenerate it in the OnlinePBX control panel.',
        });
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          message: 'Connection failed',
          error: error.message,
          hint: 'Please verify ONLINEPBX_API_KEY is valid and ONLINEPBX_DOMAIN is correct (e.g., "najot01.onlinepbx.ru")',
        });
      }
    }

    let dateFrom: Date;
    let dateTo: Date;

    switch (period) {
      case 'today':
        dateFrom = getTodayStartGMT5();
        dateTo = getTodayEndGMT5();
        break;
      case 'yesterday':
        const yesterdayRange = getYesterdayRangeGMT5();
        dateFrom = yesterdayRange.from;
        dateTo = yesterdayRange.to;
        break;
      case 'week':
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateTo = new Date();
        break;
      default:
        dateFrom = getTodayStartGMT5();
        dateTo = getTodayEndGMT5();
    }

    console.log(`[OnlinePBX/Sync] Starting sync for period: ${period}`);
    console.log(`[OnlinePBX/Sync] Date range: ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    const result = await syncOnlinePBXCalls(dateFrom, dateTo);

    const hasErrors = result.errors.length > 0;
    const isSuccess = !result.apiBlocked && !hasErrors;

    return NextResponse.json({
      success: isSuccess,
      apiBlocked: result.apiBlocked,
      period,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      result: {
        fetched: result.fetched,
        newCalls: result.newCalls,
        existingCalls: result.existingCalls,
        errors: result.errors.length,
      },
      hint: result.apiBlocked 
        ? 'OnlinePBX API access is blocked (403 Forbidden). Webhook integration still works. Contact OnlinePBX to enable API access or refresh API key.' 
        : (hasErrors ? 'Some calls failed to sync - see errorDetails' : undefined),
      errorDetails: hasErrors ? result.errors.slice(0, 10) : undefined,
    });
  } catch (error: any) {
    console.error('[OnlinePBX/Sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
