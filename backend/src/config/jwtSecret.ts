import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let cachedSecret: string | null = null;
let cachedRefreshSecret: string | null = null;

const SECRET_FILE = path.join(__dirname, '../../.jwt_secret');
const REFRESH_SECRET_FILE = path.join(__dirname, '../../.refresh_secret');

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;

  const envSecret = process.env.JWT_SECRET;
  // If user provided a custom secure secret in .env, honor it directly
  if (
    envSecret &&
    envSecret !== 'super-secret-key-12345' &&
    envSecret !== 'secret' &&
    envSecret.trim().length >= 16
  ) {
    cachedSecret = envSecret.trim();
    return cachedSecret;
  }

  // If using default/weak secret or missing, use persistent machine-specific cryptographic secret
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (saved.length >= 32) {
        cachedSecret = saved;
        return cachedSecret;
      }
    }
  } catch {}

  // Generate strong 512-bit (64-byte) random secret and persist it so it survives server restarts
  const generated = crypto.randomBytes(64).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8' });
  } catch {}

  cachedSecret = generated;
  return cachedSecret;
}

export function getRefreshSecret(): string {
  if (cachedRefreshSecret) return cachedRefreshSecret;

  const envSecret = process.env.REFRESH_SECRET;
  if (
    envSecret &&
    envSecret !== 'super-refresh-key-54321' &&
    envSecret !== 'refresh-secret' &&
    envSecret.trim().length >= 16
  ) {
    cachedRefreshSecret = envSecret.trim();
    return cachedRefreshSecret;
  }

  try {
    if (fs.existsSync(REFRESH_SECRET_FILE)) {
      const saved = fs.readFileSync(REFRESH_SECRET_FILE, 'utf8').trim();
      if (saved.length >= 32) {
        cachedRefreshSecret = saved;
        return cachedRefreshSecret;
      }
    }
  } catch {}

  const generated = crypto.randomBytes(64).toString('hex');
  try {
    fs.writeFileSync(REFRESH_SECRET_FILE, generated, { encoding: 'utf8' });
  } catch {}

  cachedRefreshSecret = generated;
  return cachedRefreshSecret;
}
