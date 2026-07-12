/**
 * Format a Date to a readable locale string.
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', ...options,
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Truncate a string to maxLen, appending '...' if truncated.
 */
export const truncate = (str, maxLen = 60) => {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '…';
};

/**
 * Format a block hash for display: show first 8 + last 8 chars.
 */
export const formatHash = (hash) => {
  if (!hash || hash.length < 16) return hash || '—';
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
};

/**
 * Format a number with locale-appropriate thousands separators.
 */
export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
};

/**
 * Convert a percentage (0–100) to a coloured Tailwind class.
 */
export const percentColor = (pct) => {
  if (pct >= 70) return 'text-green-600';
  if (pct >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Human-readable time-ago string.
 */
export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const secs  = Math.floor(diff / 1000);
  if (secs < 60)   return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
