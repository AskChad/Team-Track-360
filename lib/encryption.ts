/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-CBC encryption with initialization vectors
 */

import crypto from 'crypto';

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

/**
 * Encrypts a string using AES-256-CBC
 * Returns format: iv:encryptedText (both in hex)
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'base64'),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return format: iv:encryptedText
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * Expects format: iv:encryptedText (both in hex)
 */
export function decrypt(encrypted: string): string {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'base64'),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}
