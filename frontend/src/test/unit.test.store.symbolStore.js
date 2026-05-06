import { useSymbolStore } from './symbolStore';

describe('symbolStore', () => {
  beforeEach(() => {
    useSymbolStore.setState({
      activeSymbols: [],
      currentSymbol: null,
      regimeStates: {},
      microstructureData: {},
      altdataData: {},
      orderBooks: {},
      llmInsights: [],
      summary: null,
      alerts: [],
      connectionStatus: 'disconnected'
    });
  });

  describe('updateRegime', () => {
    test('updates regime for symbol', () => {
      const regimeData = { regime: 'trending', confidence: 0.85 };
      useSymbolStore.getState().updateRegime('BTCUSDT', regimeData);
      
      expect(useSymbolStore.getState().regimeStates.BTCUSDT).toEqual(regimeData);
    });

    test('does not overwrite other symbols', () => {
      useSymbolStore.getState().updateRegime('BTCUSDT', { regime: 'trending', confidence: 0.85 });
      useSymbolStore.getState().updateRegime('ETHUSDT', { regime: 'volatile', confidence: 0.6 });
      
      const states = useSymbolStore.getState().regimeStates;
      expect(states.BTCUSDT).toEqual({ regime: 'trending', confidence: 0.85 });
      expect(states.ETHUSDT).toEqual({ regime: 'volatile', confidence: 0.6 });
    });
  });

  describe('addAlert', () => {
    test('adds alert to queue', () => {
      const alert = { type: 'regime', message: 'Regime changed' };
      useSymbolStore.getState().addAlert(alert);
      
      expect(useSymbolStore.getState().alerts).toHaveLength(1);
      expect(useSymbolStore.getState().alerts[0]).toEqual(alert);
    });

    test('queues multiple alerts', () => {
      useSymbolStore.getState().addAlert({ message: 'Alert 1' });
      useSymbolStore.getState().addAlert({ message: 'Alert 2' });
      
      expect(useSymbolStore.getState().alerts).toHaveLength(2);
    });
  });

  describe('dismissAlert', () => {
    test('removes first alert', () => {
      useSymbolStore.getState().setState({
        alerts: [{ message: 'Alert 1' }, { message: 'Alert 2' }]
      });
      
      useSymbolStore.getState().dismissAlert();
      
      const alerts = useSymbolStore.getState().alerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toBe('Alert 2');
    });
  });

  describe('addInsight', () => {
    test('adds insight and trims to 50', () => {
      // Add 55 insights
      for (let i = 0; i < 55; i++) {
        useSymbolStore.getState().addInsight({ id: `ins_${i}`, message: `Insight ${i}` });
      }
      
      const insights = useSymbolStore.getState().llmInsights;
      expect(insights).toHaveLength(50);
      expect(insights[0].id).toBe('ins_54'); // Last added (most recent)
    });

    test('prepends new insights', () => {
      useSymbolStore.getState().addInsight({ id: 'ins_1', message: 'First' });
      useSymbolStore.getState().addInsight({ id: 'ins_2', message: 'Second' });
      
      const insights = useSymbolStore.getState().llmInsights;
      expect(insights[0].id).toBe('ins_2');
      expect(insights[1].id).toBe('ins_1');
    });
  });

  describe('updateSummary', () => {
    test('sets summary text', () => {
      useSymbolStore.getState().updateSummary('Market is bullish');
      
      expect(useSymbolStore.getState().summary).toBe('Market is bullish');
    });
  });

  describe('setConnectionStatus', () => {
    test('updates connection status', () => {
      useSymbolStore.getState().setConnectionStatus('connected');
      expect(useSymbolStore.getState().connectionStatus).toBe('connected');
      
      useSymbolStore.getState().setConnectionStatus('reconnecting');
      expect(useSymbolStore.getState().connectionStatus).toBe('reconnecting');
    });
  });
});