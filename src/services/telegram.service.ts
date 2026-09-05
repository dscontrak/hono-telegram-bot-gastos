import type { Env } from '../config'

export async function sendMessage(env: Env, chatId: number | string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!env.BOT_TOKEN) {
    return { ok: false, error: 'BOT_TOKEN not configured' }
  }

  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `Telegram API ${res.status}: ${body}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function formatSaveSuccess(monto: number, tags: string[], descripcion: string): string {
  const tagStr = tags.length ? ' ' + tags.map((t) => `#${t}`).join(' ') : ''
  const desc = descripcion ? ` - ${descripcion}` : ''
  return `Guardado: ${monto.toFixed(2)}${tagStr}${desc}`
}
