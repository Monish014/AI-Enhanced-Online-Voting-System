const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Returns a 32-byte key Buffer from env, padding/truncating as needed.
 */
const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY || 'default_key_replace_in_production!';
  return Buffer.from(raw.padEnd(32, '0').slice(0, 32));
};

/**
 * Returns a 16-byte IV Buffer from env, padding/truncating as needed.
 */
const getIV = () => {
  const raw = process.env.ENCRYPTION_IV || 'default_iv_replace';
  return Buffer.from(raw.padEnd(16, '0').slice(0, 16));
};

/**
 * Encrypts a plain-text string using AES-256-CBC.
 * Returns hex-encoded ciphertext with IV prepended (iv:ciphertext).
 */
const encrypt = (plainText) => {
  try {
    const iv = crypto.randomBytes(16); // Fresh random IV per encryption
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    throw new Error(`Encryption failed: ${err.message}`);
  }
};

/**
 * Decrypts an AES-256-CBC ciphertext produced by encrypt().
 * Expects format: ivHex:ciphertextHex
 */
const decrypt = (cipherText) => {
  try {
    const [ivHex, encrypted] = cipherText.split(':');
    if (!ivHex || !encrypted) throw new Error('Invalid ciphertext format');
    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
};

/**
 * Builds an encrypted vote payload containing the candidate choice
 * and metadata, without exposing it in plaintext anywhere.
 */
const encryptVotePayload = ({ voterId, electionId, candidateId, timestamp }) => {
  const payload = JSON.stringify({ voterId, electionId, candidateId, timestamp });
  return encrypt(payload);
};

/**
 * Decrypts a vote payload — admin/audit use only.
 */
const decryptVotePayload = (encryptedPayload) => {
  const json = decrypt(encryptedPayload);
  return JSON.parse(json);
};

module.exports = { encrypt, decrypt, encryptVotePayload, decryptVotePayload };
