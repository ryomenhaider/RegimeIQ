import { validateEmail, validatePassword, validateUsername, validateDiscordWebhook } from '../../utils/validators';

describe('validateEmail', () => {
  test('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('no@domain')).toBe(false);
  });
});

describe('validatePassword', () => {
  test('accepts valid passwords', () => {
    expect(validatePassword('Password1')).toBe(true);
    expect(validatePassword('Secure123')).toBe(true);
  });

  test('rejects weak passwords', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('alllowercase')).toBe(false);
    expect(validatePassword('ALLUPPERCASE')).toBe(false);
    expect(validatePassword('NoNumbers!')).toBe(false);
  });

  test('checks minimum length', () => {
    expect(validatePassword('Pa1')).toBe(false);
    expect(validatePassword('Password1')).toBe(true);
  });
});

describe('validateUsername', () => {
  test('accepts valid usernames', () => {
    expect(validateUsername('validuser')).toBe(true);
    expect(validateUsername('user_123')).toBe(true);
    expect(validateUsername('us')).toBe(true); // min 3
  });

  test('rejects invalid usernames', () => {
    expect(validateUsername('')).toBe(false);
    expect(validateUsername('ab')).toBe(false); // too short
    expect(validateUsername('no spaces allowed')).toBe(false);
    expect(validateUsername('special-chars!')).toBe(false);
  });
});

describe('validateDiscordWebhook', () => {
  test('accepts valid Discord webhook URLs', () => {
    expect(validateDiscordWebhook('https://discord.com/api/webhooks/123456789/abcdefghij')).toBe(true);
    expect(validateDiscordWebhook('https://discord.com/api/webhooks/123/abc')).toBe(true);
  });

  test('rejects invalid URLs', () => {
    expect(validateDiscordWebhook('')).toBe(false);
    expect(validateDiscordWebhook('https://example.com')).toBe(false);
    expect(validateDiscordWebhook('not a url')).toBe(false);
  });
});