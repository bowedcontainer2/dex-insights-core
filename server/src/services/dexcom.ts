import { config } from '../config.js';
import type { DexcomEGVResponse, DexcomEGV, DexcomTrend } from '../../../shared/types.js';

const { dexcom } = config;

const SHARE_URLS = [
  'https://shareous1.dexcom.com/ShareWebServices/Services',
  'https://share2.dexcom.com/ShareWebServices/Services',
];

async function tryAuthEndpoint(baseUrl: string, username: string, password: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/General/AuthenticatePublisherAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountName: username,
      password,
      applicationId: dexcom.applicationId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes('AccountPasswordInvalid')) return null;
    throw new Error(`Share auth failed: ${res.status} ${text}`);
  }

  return await res.json() as string;
}

let resolvedBaseUrl: string | null = null;

export async function authenticateAccount(username: string, password: string): Promise<string> {
  // If a base URL is explicitly configured and not a default, use it directly
  if (dexcom.baseUrl) {
    const result = await tryAuthEndpoint(dexcom.baseUrl, username, password);
    if (result) {
      resolvedBaseUrl = dexcom.baseUrl;
      return result;
    }
  }

  // Auto-detect: try both servers
  for (const url of SHARE_URLS) {
    const result = await tryAuthEndpoint(url, username, password);
    if (result) {
      resolvedBaseUrl = url;
      console.log(`[dexcom] Account found on ${url}`);
      return result;
    }
  }

  throw new Error('Invalid Dexcom credentials on both US and international servers');
}

function getBaseUrl(): string {
  return resolvedBaseUrl || dexcom.baseUrl;
}

export async function loginById(accountId: string, password: string): Promise<string> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/General/LoginPublisherAccountById`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      password,
      applicationId: dexcom.applicationId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Share login failed: ${res.status} ${text}`);
  }

  const sessionId = await res.json();
  return sessionId as string;
}

interface ShareGlucoseReading {
  Value: number;
  Trend: string;
  WT: string;
  ST: string;
  DT: string;
}

function parseShareTimestamp(wt: string): string {
  const match = wt.match(/Date\((\d+)\)/);
  if (match) {
    return new Date(parseInt(match[1], 10)).toISOString();
  }
  return new Date().toISOString();
}

const shareTrendMap: Record<string, DexcomTrend> = {
  'DoubleUp': 'doubleUp',
  'SingleUp': 'singleUp',
  'FortyFiveUp': 'fortyFiveUp',
  'Flat': 'flat',
  'FortyFiveDown': 'fortyFiveDown',
  'SingleDown': 'singleDown',
  'DoubleDown': 'doubleDown',
  'None': 'none',
  'NotComputable': 'notComputable',
  'RateOutOfRange': 'rateOutOfRange',
};

function mapTrend(shareTrend: string): DexcomTrend {
  return shareTrendMap[shareTrend] || 'none';
}

export async function fetchLatestReadings(
  sessionId: string,
  minutes: number = 1440,
  maxCount: number = 288,
  overrideBaseUrl?: string
): Promise<DexcomEGVResponse> {
  const baseUrl = overrideBaseUrl || getBaseUrl();
  const url = `${baseUrl}/Publisher/ReadPublisherLatestGlucoseValues?sessionId=${sessionId}&minutes=${minutes}&maxCount=${maxCount}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Share glucose fetch failed: ${res.status} ${text}`);
  }

  const readings: ShareGlucoseReading[] = await res.json();

  const egvs: DexcomEGV[] = readings.map((r) => {
    const timestamp = parseShareTimestamp(r.WT);
    return {
      value: r.Value,
      trend: mapTrend(r.Trend),
      trendRate: null,
      systemTime: timestamp,
      displayTime: timestamp,
    };
  });

  // Share API returns newest first; reverse to chronological order
  egvs.reverse();

  return {
    unit: 'mg/dL',
    rateUnit: 'mg/dL/min',
    egvs,
  };
}
