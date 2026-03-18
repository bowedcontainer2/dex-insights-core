export const config = {
  dexcom: {
    baseUrl: process.env.DEXCOM_BASE_URL || 'https://share2.dexcom.com/ShareWebServices/Services',
    applicationId: 'd89443d2-327c-4a6f-89e5-496bbb0317db',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 1024,
  },
};
