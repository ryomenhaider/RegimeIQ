/**
 * Validation utility functions
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

export const validateUsername = (username) => {
  if (!username || username.length < 3 || username.length > 20) {
    return false;
  }
  return /^[a-zA-Z0-9_]+$/.test(username);
};

export const validateSymbol = (symbol) => {
  return /^[A-Z0-9]{3,}$/.test(symbol);
};

export const validatePrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0;
};

export const validateDiscordWebhook = (url) => {
  if (!url) return false;
  const re = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
  return re.test(url);
};

export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};