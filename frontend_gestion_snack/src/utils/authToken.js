// Gestion du jeton JWT renvoyé par POST /api/auth/login.
// Stocké dans localStorage avec sa date d'expiration ; l'ancien marqueur factice 'authenticated'
// (versions précédentes, sans JWT) est traité comme une session invalide.

const TOKEN_KEY = 'token';
const EXPIRY_KEY = 'tokenExpiresAt';
const LEGACY_TOKEN = 'authenticated';

export const storeToken = (token, expiresInSeconds) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresInSeconds) {
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
  } else {
    localStorage.removeItem(EXPIRY_KEY);
  }
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
};

/** Jeton valide (présent, non factice, non expiré) ou null. */
export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === LEGACY_TOKEN) return null;
  const expiresAt = Number(localStorage.getItem(EXPIRY_KEY));
  if (expiresAt && Date.now() >= expiresAt) return null;
  return token;
};

/** En-tête Authorization à joindre aux appels qui n'utilisent pas l'instance Axios (fetch, WebSocket). */
export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
