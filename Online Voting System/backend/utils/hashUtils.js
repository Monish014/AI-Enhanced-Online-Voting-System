const crypto = require('crypto');

/**
 * SHA-256 hash of an arbitrary string.
 */
const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * HMAC-SHA256 — used for voterHash to anonymise the voter while
 * still allowing duplicate detection within a single election.
 * Key: JWT_SECRET so the mapping is secret and non-reversible.
 */
const computeVoterHash = (userId, electionId) => {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${userId}:${electionId}`)
    .digest('hex');
};

/**
 * SHA-256 hash of Aadhaar number for safe storage.
 */
const hashAadhaar = (aadhaar) => sha256(`aadhaar:${aadhaar}`);

/**
 * Generates a random OTP of the given length (default 6 digits).
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % digits.length];
  }
  return otp;
};

module.exports = { sha256, computeVoterHash, hashAadhaar, generateOTP };
