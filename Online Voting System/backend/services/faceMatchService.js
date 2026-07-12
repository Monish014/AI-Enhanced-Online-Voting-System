/**
 * Face Match Service
 *
 * Uses cosine similarity to compare two face descriptor vectors
 * (Float32Array / number[] from face-api.js on the client).
 *
 * Threshold: 0.6 distance (≈ 0.82 cosine similarity) is the standard
 * face-api.js recommendation for a confirmed match.
 */

const MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;

/**
 * Computes the Euclidean distance between two descriptor vectors.
 * face-api.js uses Euclidean distance (not cosine) internally —
 * we mirror that here for consistency.
 *
 * @param {number[]} a - stored embedding
 * @param {number[]} b - incoming embedding from client
 * @returns {number} distance (lower = more similar; < 0.6 is a match)
 */
const euclideanDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Descriptor vectors must be equal-length arrays');
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Computes cosine similarity — used as a secondary confidence metric.
 */
const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Validates a submitted face descriptor array.
 * face-api.js produces 128-element Float32Array descriptors.
 */
const validateDescriptor = (descriptor) => {
  if (!Array.isArray(descriptor)) return false;
  if (descriptor.length !== 128) return false;
  return descriptor.every((v) => typeof v === 'number' && isFinite(v));
};

/**
 * Compares two face descriptors and returns a match result.
 *
 * @param {number[]} storedEmbedding  - embedding from User.faceEmbedding
 * @param {number[]} incomingEmbedding - embedding from client POST body
 * @returns {{ match: boolean, distance: number, similarity: number }}
 */
const compareFaces = (storedEmbedding, incomingEmbedding) => {
  if (!validateDescriptor(storedEmbedding)) {
    throw new Error('Stored face embedding is invalid or missing');
  }
  if (!validateDescriptor(incomingEmbedding)) {
    throw new Error('Submitted face embedding is invalid (must be 128-element number array)');
  }

  const distance = euclideanDistance(storedEmbedding, incomingEmbedding);
  const similarity = cosineSimilarity(storedEmbedding, incomingEmbedding);
  const match = distance < MATCH_THRESHOLD;

  return { match, distance: parseFloat(distance.toFixed(4)), similarity: parseFloat(similarity.toFixed(4)) };
};

/**
 * Calculates a risk score (0–100) for a face verification attempt.
 * Higher = riskier.
 */
const calculateFaceRiskScore = ({ match, distance, livenessPass, failedAttempts }) => {
  let score = 0;

  if (!match) score += 50;
  if (!livenessPass) score += 30;
  if (distance > 0.8) score += 10;
  if (failedAttempts >= 3) score += 10;

  return Math.min(100, score);
};

module.exports = { compareFaces, validateDescriptor, calculateFaceRiskScore, MATCH_THRESHOLD };
