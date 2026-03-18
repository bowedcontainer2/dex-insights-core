import type { DexcomEGV, DexcomTrend } from '../types/dexcom';

function generateRealisticEGVs(): DexcomEGV[] {
  const egvs: DexcomEGV[] = [];
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let value = 110;
  const trends: DexcomTrend[] = [
    'flat', 'fortyFiveUp', 'singleUp', 'fortyFiveUp', 'flat',
    'fortyFiveDown', 'singleDown', 'fortyFiveDown', 'flat',
  ];

  for (let i = 0; i < 288; i++) {
    const timestamp = new Date(start.getTime() + i * 5 * 60 * 1000);
    const hour = timestamp.getHours();

    // Simulate realistic daily patterns
    let drift = (Math.random() - 0.5) * 6;

    // Dawn phenomenon: rise 4am-7am
    if (hour >= 4 && hour < 7) drift += 2;
    // Post-breakfast spike: 7am-9am
    if (hour >= 7 && hour < 9) drift += 4;
    // Post-breakfast recovery: 9am-11am
    if (hour >= 9 && hour < 11) drift -= 3;
    // Post-lunch spike: 12pm-2pm
    if (hour >= 12 && hour < 14) drift += 3;
    // Afternoon stability: 2pm-5pm
    if (hour >= 14 && hour < 17) drift -= 1;
    // Post-dinner spike: 6pm-8pm
    if (hour >= 18 && hour < 20) drift += 3.5;
    // Evening decline: 8pm-11pm
    if (hour >= 20 && hour < 23) drift -= 2;

    value = Math.max(55, Math.min(300, value + drift));

    const trendIdx = Math.floor((i / 288) * trends.length) % trends.length;
    const trend = trends[trendIdx];

    egvs.push({
      value: Math.round(value),
      trend,
      trendRate: drift > 1 ? 1.5 : drift < -1 ? -1.5 : 0.2,
      systemTime: timestamp.toISOString(),
      displayTime: timestamp.toISOString(),
    });
  }

  return egvs;
}

let cachedEGVs: DexcomEGV[] | null = null;

export function getMockEGVs(): DexcomEGV[] {
  if (!cachedEGVs) {
    cachedEGVs = generateRealisticEGVs();
  }
  return cachedEGVs;
}

export function getMockCurrentReading(): DexcomEGV {
  const egvs = getMockEGVs();
  return egvs[egvs.length - 1];
}
