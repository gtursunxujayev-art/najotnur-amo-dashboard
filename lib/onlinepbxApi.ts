import crypto from 'crypto';

interface OnlinePBXAuthResponse {
  status: string;
  data?: {
    key_id: string;
    key: string;
  };
  error?: string;
  comment?: string;
}

interface OnlinePBXCallRecord {
  uuid: string;
  type: 'in' | 'out';
  caller: string;
  called: string;
  user?: string;
  extension?: string;
  date: string;
  duration: number;
  talk_duration?: number;
  status: string;
}

interface OnlinePBXCallHistoryResponse {
  status: string;
  data?: OnlinePBXCallRecord[];
  error?: string;
}

let cachedAuth: { keyId: string; key: string; expires: number; domainFormat: string; apiBase: string } | null = null;

function getOnlinePBXDomain(): string {
  const domain = process.env.ONLINEPBX_DOMAIN;
  if (!domain) {
    throw new Error('ONLINEPBX_DOMAIN environment variable is not set');
  }
  if (domain.includes('.onlinepbx.ru')) {
    return domain.replace('.onlinepbx.ru', '');
  }
  if (domain.includes('.onpbx.ru')) {
    return domain.replace('.onpbx.ru', '');
  }
  return domain;
}

function getOnlinePBXApiKey(): string {
  const apiKey = process.env.ONLINEPBX_API_KEY;
  if (!apiKey) {
    throw new Error('ONLINEPBX_API_KEY environment variable is not set');
  }
  return apiKey;
}


async function authenticateApi2(): Promise<{ keyId: string; key: string; domainFormat: string; apiBase: string } | null> {
  const domain = getOnlinePBXDomain();
  const apiKey = getOnlinePBXApiKey();
  const apiBase = 'https://api2.onlinepbx.ru';
  
  const domainFormats = [`${domain}.onpbx.ru`, `${domain}.onlinepbx.ru`];
  
  for (const domainFormat of domainFormats) {
    try {
      const authUrl = `${apiBase}/${domainFormat}/auth.json`;
      console.log(`[OnlinePBX/API] Trying API v2 auth with domain: ${domainFormat}`);
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `auth_key=${encodeURIComponent(apiKey)}`,
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`[OnlinePBX/API] API v2 auth failed with ${domainFormat}: ${response.status} - ${text.substring(0, 200)}`);
        continue;
      }

      const result: OnlinePBXAuthResponse = await response.json();
      
      if (result.status === '1' && result.data) {
        console.log(`[OnlinePBX/API] API v2 authentication successful with domain: ${domainFormat}`);
        return { 
          keyId: result.data.key_id, 
          key: result.data.key, 
          domainFormat, 
          apiBase 
        };
      }
      console.log(`[OnlinePBX/API] API v2 returned non-success:`, result);
    } catch (err) {
      console.log(`[OnlinePBX/API] API v2 auth error with ${domainFormat}:`, err);
    }
  }
  
  return null;
}


async function authenticate(): Promise<{ keyId: string; key: string }> {
  if (cachedAuth && cachedAuth.expires > Date.now()) {
    console.log('[OnlinePBX/API] Using cached authentication');
    return { keyId: cachedAuth.keyId, key: cachedAuth.key };
  }

  const api2Result = await authenticateApi2();
  if (api2Result) {
    cachedAuth = {
      keyId: api2Result.keyId,
      key: api2Result.key,
      expires: Date.now() + 2 * 24 * 60 * 60 * 1000,
      domainFormat: api2Result.domainFormat,
      apiBase: api2Result.apiBase,
    };
    return { keyId: api2Result.keyId, key: api2Result.key };
  }

  throw new Error('OnlinePBX auth failed. Please verify ONLINEPBX_API_KEY and ONLINEPBX_DOMAIN are correct.');
}

async function apiRequest(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const { keyId, key } = await authenticate();
  
  if (!cachedAuth) {
    throw new Error('Authentication required but not cached');
  }
  
  const url = `${cachedAuth.apiBase}/${cachedAuth.domainFormat}/${endpoint}`;
  const body = new URLSearchParams(params).toString();
  
  console.log(`[OnlinePBX/API] API v2 request to ${endpoint}`, { params });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-pbx-authentication': `${keyId}:${key}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OnlinePBX API error: ${response.status} - ${text}`);
  }

  return response.json();
}

export async function fetchOnlinePBXCallHistory(
  dateFrom: Date,
  dateTo: Date
): Promise<OnlinePBXCallRecord[]> {
  try {
    console.log(`[OnlinePBX/API] Fetching call history from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    await authenticate();
    
    // Use mongo_history/search.json endpoint with Unix timestamps
    const startStamp = Math.floor(dateFrom.getTime() / 1000);
    const endStamp = Math.floor(dateTo.getTime() / 1000);
    
    const result = await apiRequest('mongo_history/search.json', {
      start_stamp_from: startStamp.toString(),
      start_stamp_to: endStamp.toString(),
    });

    if (result.status !== '1') {
      console.error('[OnlinePBX/API] API returned error:', result);
      throw new Error(`API error: ${result.comment || result.error || 'Unknown'}`);
    }

    const calls: OnlinePBXCallRecord[] = result.data || [];
    console.log(`[OnlinePBX/API] Fetched ${calls.length} calls from API`);
    
    return calls;
  } catch (error) {
    console.error('[OnlinePBX/API] Error fetching call history:', error);
    throw error;
  }
}

export interface SyncResult {
  fetched: number;
  newCalls: number;
  existingCalls: number;
  errors: string[];
  apiBlocked: boolean;
}

export async function syncOnlinePBXCalls(
  dateFrom: Date,
  dateTo: Date
): Promise<SyncResult> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const result: SyncResult = {
    fetched: 0,
    newCalls: 0,
    existingCalls: 0,
    errors: [],
    apiBlocked: false,
  };

  let calls: any[];
  try {
    calls = await fetchOnlinePBXCallHistory(dateFrom, dateTo);
    result.fetched = calls.length;
  } catch (fetchError: any) {
    const errorMessage = fetchError.message || 'Unknown fetch error';
    if (errorMessage.includes('403') || errorMessage.includes('auth failed')) {
      result.apiBlocked = true;
      result.errors.push(`API access blocked: ${errorMessage}`);
    } else {
      result.errors.push(`Fetch error: ${errorMessage}`);
    }
    await prisma.$disconnect();
    return result;
  }

  try {
    for (const call of calls) {
      try {
        const callId = call.uuid || call.id || '';
        if (!callId) {
          result.errors.push('Call missing UUID/ID');
          continue;
        }

        const existingCall = await prisma.onlinePBXCall.findFirst({
          where: { callId },
        });

        if (existingCall) {
          result.existingCalls++;
          continue;
        }

        const rawType = call.type || call.direction || '';
        const direction = rawType === 'incoming' || rawType === 'in' ? 'in' : 'out';
        
        const phone = direction === 'in' 
          ? (call.caller || call.src || call.phone || '') 
          : (call.called || call.dst || call.phone || '');
        
        const extension = call.extension || call.user || call.dst || '';
        const managerName = mapExtensionToManager(extension) || extension || 'Unknown';
        
        const callDate = call.date 
          ? new Date(call.date) 
          : call.start_stamp 
            ? new Date(call.start_stamp * 1000) 
            : new Date();
        
        await prisma.onlinePBXCall.create({
          data: {
            callId,
            direction,
            date: callDate,
            duration: call.talk_duration || call.duration || call.billsec || 0,
            phone,
            user: managerName,
            source: 'api',
          },
        });
        
        result.newCalls++;
      } catch (err: any) {
        result.errors.push(`Failed to save call ${call.uuid || call.id}: ${err.message}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`[OnlinePBX/Sync] Result: fetched=${result.fetched}, new=${result.newCalls}, existing=${result.existingCalls}, errors=${result.errors.length}`);
  return result;
}

function mapExtensionToManager(extension: string): string | null {
  const extensionMap: Record<string, string> = {
    '101': 'Zilola',
    '102': 'Dilshod',
    '103': 'Mohinur',
    '104': 'Sabina',
    '105': 'Oyshaxon',
    '106': 'Odina',
    '107': 'Durdona',
    '108': 'Muxlisa',
    '109': 'Gulsanam',
    '110': 'Mavjuda',
    '111': 'Muxammad',
  };
  
  return extensionMap[extension] || null;
}

export async function testOnlinePBXConnection(): Promise<boolean> {
  try {
    console.log('[OnlinePBX/API] Testing connection...');
    await authenticate();
    console.log('[OnlinePBX/API] Connection test successful');
    return true;
  } catch (error) {
    console.error('[OnlinePBX/API] Connection test failed:', error);
    return false;
  }
}
