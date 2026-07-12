/**
 * Returns true if a string is a valid 64-char lowercase hex SHA-256 hash.
 */
export const isValidBlockHash = (hash) =>
  typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);

/**
 * Returns true if value is a valid 128-element face descriptor array.
 */
export const isValidDescriptor = (descriptor) =>
  Array.isArray(descriptor) &&
  descriptor.length === 128 &&
  descriptor.every((v) => typeof v === 'number' && isFinite(v));

/**
 * Returns true if a MongoDB ObjectId string is structurally valid.
 */
export const isMongoId = (id) =>
  typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

/**
 * Validates email format.
 */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Validates phone number format (7–15 chars, optional country code).
 */
export const isValidPhone = (phone) =>
  /^\+?[\d\s\-()]{7,15}$/.test(phone);
