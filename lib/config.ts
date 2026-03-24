export const config = {
  dexcom: {
    baseUrl: process.env.DEXCOM_BASE_URL || 'https://share2.dexcom.com/ShareWebServices/Services',
    applicationId: 'd89443d2-327c-4a6f-89e5-496bbb0317db',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: 1024,
  },
};
