import crypto from 'node:crypto';

const SECRET = process.env.CAPTCHA_SECRET || 'keepnoteai-default-captcha-secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCaptcha(): { token: string; code: string } {
  let code = '';
  for (let i = 0; i < 5; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  const payload = JSON.stringify({ code, exp: Date.now() + 5 * 60 * 1000 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const token = Buffer.concat([iv, tag, enc]).toString('base64url');
  return { token, code };
}

export function verifyCaptcha(token?: string | null, input?: string | null): boolean {
  if (!token || !input) return false;
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return false;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const payload = JSON.parse(json) as { code: string; exp: number };
    if (!payload.exp || payload.exp < Date.now()) return false;
    return payload.code === input.trim().toUpperCase();
  } catch {
    return false;
  }
}
