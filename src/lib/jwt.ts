import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

const secret = new TextEncoder().encode(config.jwtSecretKey);

export interface TokenPayload {
  sub: string;
  role?: string;
  name?: string;
  picture?: string;
  provider?: string;
  exp?: number;
}

export async function createAccessToken(data: Record<string, unknown>, expiresMinutes?: number): Promise<string> {
  const exp = expiresMinutes || config.jwtExpirationMinutes;
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${exp}m`)
    .sign(secret);
}

export async function createRefreshToken(data: Record<string, unknown>): Promise<string> {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
