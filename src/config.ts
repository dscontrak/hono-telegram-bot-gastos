export type Env = {
  DB: D1Database
  BOT_TOKEN: string
  WEBHOOK_SECRET_TOKEN?: string
  ALLOWED_CHAT_ID?: string
}

export function getEnv(c: { env: Env }): Env {
  return c.env
}

export function validateEnv(env: Partial<Env>): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (!env.DB) missing.push('DB')
  if (!env.BOT_TOKEN) missing.push('BOT_TOKEN')
  return { ok: missing.length === 0, missing }
}
