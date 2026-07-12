/**
 * Typed localStorage helpers with JSON serialisation and error handling.
 */

export const storage = {
  get: (key, fallback = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
  clear: () => {
    try { localStorage.clear(); } catch { /* ignore */ }
  },
};

export const session = {
  get: (key, fallback = null) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove: (key) => {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};
