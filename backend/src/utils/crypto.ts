import crypto from 'crypto';

// Must be exactly 32 bytes for AES-256-CBC.
// In production set ENCRYPTION_KEY to a 32-char secret (run: node -e "require('crypto').randomBytes(32).toString('hex')")
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const IV_LENGTH = 16; // AES block size is always 16 bytes

if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY env var not set in production! Mailbox passwords will be insecure.');
  process.exit(1);
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
