import { rest } from 'msw';

const BASE_URL = '/api';

export const handlers = [
  // Auth endpoints
  rest.post(`${BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.json({
        accessToken: 'mock-token-123',
        username: 'testuser',
        plan: 'trial',
        expiresIn: 3600
      })
    );
  }),

  rest.post(`${BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.json({
        accessToken: 'mock-token-456',
        username: req.body.username,
        plan: 'trial',
        expiresIn: 3600
      })
    );
  }),

  rest.get(`${BASE_URL}/auth/csrf`, (req, res, ctx) => {
    return res(ctx.json({ token: 'mock-csrf-token' }));
  }),

  rest.get(`${BASE_URL}/auth/check-username`, (req, res, ctx) => {
    const { username } = req.params;
    const taken = ['admin', 'test', 'root'].includes(username);
    return res(ctx.json({ available: !taken }));
  }),

  // User settings
  rest.get(`${BASE_URL}/users/:username/settings`, (req, res, ctx) => {
    return res(
      ctx.json({
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
      })
    );
  }),

  rest.patch(`${BASE_URL}/users/:username/settings`, (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),

  // Regime
  rest.get(`${BASE_URL}/regime/:symbol/current`, (req, res, ctx) => {
    return res(
      ctx.json({
        regime: 'trending',
        confidence: 0.87,
        entered_at: new Date().toISOString(),
        transition_warning: false,
        posterior_probabilities: {
          trending: 0.72,
          mean_reverting: 0.18,
          volatile: 0.08,
          illiquid: 0.02
        },
        transition_matrix: {
          trending: { trending: 0.8, mean_reverting: 0.15, volatile: 0.04, illiquid: 0.01 },
          mean_reverting: { trending: 0.2, mean_reverting: 0.7, volatile: 0.08, illiquid: 0.02 },
          volatile: { trending: 0.1, mean_reverting: 0.2, volatile: 0.6, illiquid: 0.1 },
          illiquid: { trending: 0.05, mean_reverting: 0.1, volatile: 0.25, illiquid: 0.6 }
        }
      })
    );
  }),

  rest.get(`${BASE_URL}/regime/:symbol/history`, (req, res, ctx) => {
    return res(
      ctx.json([
        { regime: 'trending', start: new Date(Date.now() - 3600000).toISOString(), end: new Date().toISOString(), duration: 3600000 },
        { regime: 'volatile', start: new Date(Date.now() - 7200000).toISOString(), end: new Date(Date.now() - 3600000).toISOString(), duration: 3600000 },
        { regime: 'mean_reverting', start: new Date(Date.now() - 10800000).toISOString(), end: new Date(Date.now() - 7200000).toISOString(), duration: 3600000 }
      ])
    );
  }),

  rest.get(`${BASE_URL}/regime/:symbol/model`, (req, res, ctx) => {
    return res(
      ctx.json({
        tier: 'dedicated',
        trained_at: new Date(Date.now() - 432000000).toISOString(),
        n_observations: 15420,
        status: 'OK'
      })
    );
  }),

  // Symbols
  rest.get(`${BASE_URL}/symbols/list`, (req, res, ctx) => {
    return res(
      ctx.json([
        { symbol: 'BTCUSDT', daysOfData: 365 },
        { symbol: 'ETHUSDT', daysOfData: 365 },
        { symbol: 'SOLUSDT', daysOfData: 180 },
        { symbol: 'BNBUSDT', daysOfData: 90 }
      ])
    );
  }),

  // Microstructure
  rest.get(`${BASE_URL}/microstructure/:symbol`, (req, res, ctx) => {
    return res(
      ctx.json({
        vpin: 0.42,
        kyleLambda: 0.0008,
        cvd: -523,
        tradeIntensity: 12.5,
        adverseSelectionPct: 0.35,
        vwapDeviation: 0.02,
        spread: 0.01,
        ofi: 142,
        midPrice: 42150.50
      })
    );
  }),

  // Order book
  rest.get(`${BASE_URL}/orderbook/:symbol`, (req, res, ctx) => {
    return res(
      ctx.json({
        bids: [
          { price: 42145.50, qty: 2.5 },
          { price: 42144.00, qty: 1.2 },
          { price: 42142.80, qty: 3.0 }
        ],
        asks: [
          { price: 42155.50, qty: 1.8 },
          { price: 42156.00, qty: 2.2 },
          { price: 42157.50, qty: 0.5 }
        ],
        spread: 10.0
      })
    );
  }),

  // Alt data
  rest.get(`${BASE_URL}/altdata/fred-series`, (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 'DFF', name: 'Federal Funds Rate' },
        { id: 'VIX', name: 'CBOE Volatility Index' },
        { id: 'TED', name: 'TED Spread' }
      ])
    );
  }),

  // Performance log
  rest.get(`${BASE_URL}/performance/log`, (req, res, ctx) => {
    return res(
      ctx.json([
        { date: '2024-01-15', symbol: 'BTCUSDT', regime: 'trending', confidence: 0.85, outcome: 'profit', return: 2.3 },
        { date: '2024-01-14', symbol: 'BTCUSDT', regime: 'volatile', confidence: 0.62, outcome: 'loss', return: -1.2 }
      ])
    );
  }),

  // Payment
  rest.post(`${BASE_URL}/payment/create`, (req, res, ctx) => {
    return res(
      ctx.json({
        invoice_url: 'https://example.com/invoice/123',
        invoice_id: 'inv_123'
      })
    );
  }),

  rest.get(`${BASE_URL}/payment/status/:invoiceId`, (req, res, ctx) => {
    return res(ctx.json({ status: 'paid' }));
  }),

  rest.post(`${BASE_URL}/payment/cancel`, (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),

  // Billing
  rest.get(`${BASE_URL}/users/:username/billing`, (req, res, ctx) => {
    return res(
      ctx.json({
        plan: 'trial',
        status: 'trial',
        renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trialRemaining: 7,
        symbolsUsed: 1
      })
    );
  }),

  rest.get(`${BASE_URL}/users/:username/payment-history`, (req, res, ctx) => {
    return res(ctx.json([]));
  })
];