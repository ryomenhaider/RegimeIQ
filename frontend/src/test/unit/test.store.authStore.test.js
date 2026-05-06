import { useAuthStore } from '../../store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      username: null,
      plan: null,
      expiry: null
    });
  });

  describe('setAuth', () => {
    test('sets auth credentials with expiry calculation', () => {
      useAuthStore.getState().setAuth('token123', 'testuser', 'trial', 3600);
      
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token123');
      expect(state.username).toBe('testuser');
      expect(state.plan).toBe('trial');
      expect(state.expiry).toBeGreaterThan(Date.now());
    });

    test('calculates expiry correctly', () => {
      const before = Date.now();
      useAuthStore.getState().setAuth('token', 'user', 'standard', 3600);
      const after = Date.now();
      
      const expiry = useAuthStore.getState().expiry;
      expect(expiry).toBeGreaterThan(before + 3600000 - 1000);
      expect(expiry).toBeLessThan(after + 3600000 + 1000);
    });
  });

  describe('clearAuth', () => {
    test('clears all auth state', () => {
      useAuthStore.getState().setAuth('token', 'user', 'trial', 3600);
      useAuthStore.getState().clearAuth();
      
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.username).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.expiry).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('returns false when no token', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    test('returns false when token expired', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, accessToken: 'old', expiry: Date.now() - 1000 });
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    test('returns true when token valid', () => {
      useAuthStore.getState().setAuth('token', 'user', 'trial', 3600);
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    test('returns token when valid', () => {
      useAuthStore.getState().setAuth('mytoken', 'user', 'trial', 3600);
      expect(useAuthStore.getState().getToken()).toBe('mytoken');
    });

    test('returns null when expired', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, accessToken: 'expired', expiry: Date.now() - 1000 });
      expect(useAuthStore.getState().getToken()).toBeNull();
    });
  });

  describe('getExpiresIn', () => {
    test('returns 0 when no expiry', () => {
      expect(useAuthStore.getState().getExpiresIn()).toBe(0);
    });

    test('returns remaining seconds', () => {
      const state = useAuthStore.getState();
      const futureExpiry = Date.now() + 60000;
      useAuthStore.setState({ ...state, expiry: futureExpiry });
      const remaining = useAuthStore.getState().getExpiresIn();
      expect(remaining).toBeGreaterThan(55);
      expect(remaining).toBeLessThanOrEqual(60);
    });
  });

  describe('getSymbolLimit', () => {
    test('returns trial limit', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, plan: 'trial' });
      expect(useAuthStore.getState().getSymbolLimit()).toBe(3);
    });

    test('returns standard limit', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, plan: 'standard' });
      expect(useAuthStore.getState().getSymbolLimit()).toBe(10);
    });

    test('returns unlimited (infinity)', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, plan: 'unlimited' });
      expect(useAuthStore.getState().getSymbolLimit()).toBe(Infinity);
    });

    test('defaults to trial for unknown plan', () => {
      const state = useAuthStore.getState();
      useAuthStore.setState({ ...state, plan: 'unknown' });
      expect(useAuthStore.getState().getSymbolLimit()).toBe(3);
    });
  });
});