import { http, HttpResponse } from 'msw';

const BASE_URL = '/api';

export const handlers = [
  http.post(`${BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      access_token: 'mock-token-123',
      username: 'testuser',
      plan: 'trial',
      expires_in: 3600
    });
  }),

  http.post(`${BASE_URL}/auth/register`, ({ request }) => {
    return HttpResponse.json({
      access_token: 'mock-token-456',
      username: 'testuser',
      plan: 'trial',
      expires_in: 3600
    });
  }),

  http.get(`${BASE_URL}/auth/csrf`, () => {
    return HttpResponse.json({ csrf_token: 'mock-csrf-token' });
  }),

  http.get(`${BASE_URL}/auth/check-username/:username`, ({ params }) => {
    const { username } = params;
    const taken = ['admin', 'test', 'root'].includes(username);
    return HttpResponse.json({ available: !taken });
  }),

  http.get(`${BASE_URL}/users/:username/settings`, () => {
    return HttpResponse.json({
      watchedSymbols: ['BTCUSDT'],
      defaultTab: 'microstructure',
      discordWebhook: '',
      confluenceThreshold: 0.5,
      regimeConfidenceThreshold: 0.7,
      redditSubreddits: [],
      googleTrendsKeywords: [],
      fredSeries: [],
      timezone: 'UTC',
      emailAlerts: true,
      regimeAlerts: true,
      weeklySummary: true
    });
  }),

  http.patch(`${BASE_URL}/users/:username/settings`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${BASE_URL}/regime/:symbol/current`, () => {
    return HttpResponse.json({
      regime: 'trending',
      confidence: 0.87,
      entered_at: new Date().toISOString(),
      transition_warning: false,
      posterior_probabilities: {
        trending: 0.72,
        mean_reverting: 0.18,
        volatile: 0.08,
        illiquid: 0.02
      }
    });
  }),

  http.get(`${BASE_URL}/symbols/list`, () => {
    return HttpResponse.json([
      { symbol: 'BTCUSDT', daysOfData: 365 },
      { symbol: 'ETHUSDT', daysOfData: 365 },
      { symbol: 'SOLUSDT', daysOfData: 180 }
    ]);
  }),

  http.get(`${BASE_URL}/microstructure/:symbol`, () => {
    return HttpResponse.json({
      vpin: 0.42,
      kyleLambda: 0.0008,
      cvd: -523,
      tradeIntensity: 12.5,
      adverseSelectionPct: 0.35,
      vwapDeviation: 0.02,
      spread: 0.01,
      ofi: 142,
      midPrice: 42150.50
    });
  }),

  http.get(`${BASE_URL}/orderbook/:symbol`, () => {
    return HttpResponse.json({
      bids: [
        { price: 42145.50, qty: 2.5 },
        { price: 42144.00, qty: 1.2 }
      ],
      asks: [
        { price: 42155.50, qty: 1.8 },
        { price: 42156.00, qty: 2.2 }
      ],
      spread: 10.0
    });
  }),

  http.get(`${BASE_URL}/altdata/fred-series`, () => {
    return HttpResponse.json([
      { id: 'DFF', name: 'Federal Funds Rate' },
      { id: 'VIX', name: 'CBOE Volatility Index' }
    ]);
  }),

  http.post(`${BASE_URL}/payment/create`, () => {
    return HttpResponse.json({
      invoice_url: 'https://example.com/invoice/123',
      invoice_id: 'inv_123'
    });
  }),

  http.get(`${BASE_URL}/users/:username/billing`, () => {
    return HttpResponse.json({
      plan: 'trial',
      status: 'trial',
      renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      trialRemaining: 7,
      symbolsUsed: 1
    });
  })
];