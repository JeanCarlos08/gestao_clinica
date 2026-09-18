import bcrypt from "bcryptjs";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  // 1) bcrypt (formato $2a$ / $2b$)
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      if (bcrypt.compareSync(password, hash)) return true;
    } catch {}
  }
  // 2) SHA256 hex (64 chars) - legado gestao_clinica
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    const sha = crypto.createHash("sha256").update(password).digest("hex");
    if (sha.toLowerCase() === hash.toLowerCase()) return true;
  }
  // 3) fallback texto puro (APP_ADMIN_PASS em .env sem hash)
  if (password === hash) return true;
  return false;
}
