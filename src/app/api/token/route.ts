import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { createAccessToken, createRefreshToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { config } from "@/lib/config";
import { getClientIp, jsonOk, jsonError } from "@/lib/utils";
import { ensureSchema } from "@/lib/db";

let schemaReady = false;

async function ensureDb() {
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
}

async function checkBruteForce(username: string, ip: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - config.loginBlockMinutes * 60 * 1000).toISOString();
    const attempts = await sql`
      SELECT COUNT(*) as cnt FROM login_attempts
      WHERE username = ${username} AND sucesso = false AND tentado_em > ${cutoff}
    `;
    return (attempts[0]?.cnt ?? 0) >= config.maxLoginAttempts;
  } catch {
    return false;
  }
}

async function recordLoginAttempt(username: string, success: boolean, ip: string) {
  try {
    await sql`INSERT INTO login_attempts (username, ip_address, sucesso) VALUES (${username}, ${ip}, ${success})`;
    if (success) {
      await sql`UPDATE login_attempts SET sucesso = true WHERE username = ${username} AND ip_address = ${ip} AND id = (SELECT id FROM login_attempts WHERE username = ${username} ORDER BY id DESC LIMIT 1)`;
    }
  } catch {}
}

export async function POST(request: NextRequest) {
  await ensureDb();
  const ip = getClientIp(request);

  let username: string;
  let password: string;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    username = body.username || "";
    password = body.password || "";
  } else {
    const formData = await request.formData();
    username = formData.get("username") as string || "";
    password = formData.get("password") as string || "";
  }

  if (!username || !password) {
    return jsonError("Usuário e senha são obrigatórios.", 400);
  }

  if (await checkBruteForce(username, ip)) {
    return jsonError(
      `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${config.loginBlockMinutes} minutos.`,
      429
    );
  }

  let authenticated = false;
  let userRole = "admin";

  // Mode 1: DB user
  try {
    const users = await sql`SELECT id, username, role FROM users WHERE username = ${username}`;
    if (users.length > 0) {
      const user = users[0];
      const hashes = await sql`SELECT password_hash FROM users WHERE username = ${username}`;
      if (hashes.length > 0 && verifyPassword(password, hashes[0].password_hash)) {
        authenticated = true;
        userRole = user.role || "admin";
      }
    }
  } catch {}

  // Mode 2: .env fallback
  if (!authenticated && config.authPassword) {
    if (username === config.authUsername && verifyPassword(password, config.authPassword)) {
      authenticated = true;
    }
  }

  await recordLoginAttempt(username, authenticated, ip);

  if (!authenticated) {
    return jsonError("Usuário ou senha incorretos.", 401);
  }

  // Update last_login
  try {
    await sql`UPDATE users SET last_login = NOW() WHERE username = ${username}`;
  } catch {}

  const accessToken = await createAccessToken({ sub: username, role: userRole });
  const refreshToken = await createRefreshToken({ sub: username, role: userRole });

  return jsonOk({ access_token: accessToken, refresh_token: refreshToken, token_type: "bearer" });
}
