export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecretKey: process.env.JWT_SECRET_KEY || "change-me-to-a-secure-random-key",
  jwtExpirationMinutes: parseInt(process.env.JWT_EXPIRATION_MINUTES || "1440"),
  authUsername: process.env.APP_ADMIN_USER || "admin",
  authPassword: process.env.APP_ADMIN_PASS || "",
  appEnv: process.env.APP_ENV || "development",
  appName: process.env.APP_NAME || "MVP Psicologia",
  appVersion: "3.0.0",

  geminiApiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash,gemini-2.0-flash-lite").split(","),

  googleDocsTemplateId: process.env.GOOGLE_DOCS_TEMPLATE_ID || "",

  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",

  microsoftOAuthClientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
  microsoftOAuthClientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "",
  microsoftOAuthTenantId: process.env.MICROSOFT_OAUTH_TENANT_ID || "common",

  appleOAuthClientId: process.env.APPLE_OAUTH_CLIENT_ID || "",
  appleOAuthTeamId: process.env.APPLE_OAUTH_TEAM_ID || "",
  appleOAuthKeyId: process.env.APPLE_OAUTH_KEY_ID || "",
  appleOAuthPrivateKey: process.env.APPLE_OAUTH_PRIVATE_KEY || "",

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim()),

  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
  loginBlockMinutes: parseInt(process.env.LOGIN_BLOCK_MINUTES || "15"),

  dpoEmail: process.env.DPO_EMAIL || "dpo@clinicaia.com.br",
  dpoNome: process.env.DPO_NOME || "Encarregado de Dados (DPO)",
};
