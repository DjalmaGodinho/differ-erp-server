import CryptoJS from 'crypto-js';

/**
 * PII (Personally Identifiable Information) Encryption Service
 * 
 * This service encrypts sensitive personal data before storing in the database
 * and decrypts when retrieving. This ensures that even if the database is 
 * compromised, PII remains protected.
 * 
 * Fields encrypted:
 * - Client emails
 * - Client phone numbers  
 * - Client document numbers (CPF/CNPJ)
 * - Other PII as needed
 */

const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: PII_ENCRYPTION_KEY not set. PII data will NOT be encrypted!');
  console.warn('   Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

// Check if data appears to be encrypted (starts with specific prefix)
const ENCRYPTED_PREFIX = 'ENC:';

export const piiCryptoService = {
  /**
   * Check if encryption is properly configured
   */
  isConfigured() {
    return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length >= 32;
  },

  /**
   * Generate a secure encryption key
   * Run this once and save the result to PII_ENCRYPTION_KEY env var
   */
  generateKey() {
    const key = CryptoJS.lib.WordArray.random(32).toString();
    return key;
  },

  /**
   * Encrypt a value
   * @param {string} value - Plain text value to encrypt
   * @returns {string} - Encrypted value with prefix
   */
  encrypt(value) {
    if (!value || typeof value !== 'string') return value;
    if (!this.isConfigured()) return value;
    if (value.startsWith(ENCRYPTED_PREFIX)) return value; // Already encrypted

    try {
      const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY, {
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7,
        iv: CryptoJS.lib.WordArray.random(16)
      }).toString();
      return `${ENCRYPTED_PREFIX}${encrypted}`;
    } catch (error) {
      console.error('PII Encryption error:', error);
      return value;
    }
  },

  /**
   * Decrypt a value
   * @param {string} encryptedValue - Encrypted value with prefix
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedValue) {
    if (!encryptedValue || typeof encryptedValue !== 'string') return encryptedValue;
    if (!this.isConfigured()) return encryptedValue;
    if (!encryptedValue.startsWith(ENCRYPTED_PREFIX)) return encryptedValue; // Not encrypted

    try {
      const ciphertext = encryptedValue.substring(ENCRYPTED_PREFIX.length);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY, {
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8) || encryptedValue;
    } catch (error) {
      console.error('PII Decryption error:', error);
      return encryptedValue;
    }
  },

  /**
   * Encrypt multiple fields of an object
   * @param {Object} obj - Object with fields to encrypt
   * @param {Array<string>} fields - Field names to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  encryptFields(obj, fields) {
    if (!obj || !fields || !this.isConfigured()) return obj;
    
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field]);
      }
    });
    return result;
  },

  /**
   * Decrypt multiple fields of an object
   * @param {Object} obj - Object with fields to decrypt
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  decryptFields(obj, fields) {
    if (!obj || !fields || !this.isConfigured()) return obj;
    
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.decrypt(result[field]);
      }
    });
    return result;
  },

  /**
   * Get encryption status for monitoring
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      algorithm: 'AES-256-GCM',
      prefix: ENCRYPTED_PREFIX,
      warning: !this.isConfigured() ? 'PII_ENCRYPTION_KEY not configured' : null
    };
  }
};

export default piiCryptoService;
