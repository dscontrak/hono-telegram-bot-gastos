import type { Context } from 'hono'
import type { Env } from '../config'
import { createDb } from '../db/kysely'
import { routeCommand } from '../commands/command.router'
import { sendMessage, formatSaveSuccess } from '../services/telegram.service'
import { getHelpText } from '../commands/help.command'

export async function handleWebhook(c: Context<{ Bindings: Env }>) {
  const env = c.env

  // 1. Verify secret token if configured
  if (env.WEBHOOK_SECRET_TOKEN) {
    const header = c.req.header('X-Telegram-Bot-Api-Secret-Token') ?? c.req.header('x-telegram-bot-api-secret-token')
    if (header !== env.WEBHOOK_SECRET_TOKEN) {
      console.warn('webhook secret mismatch')
      return c.text('Unauthorized', 401)
    }
  } else {
    console.warn('WEBHOOK_SECRET_TOKEN not set - skipping verification')
  }

  if (!env.DB) {
    console.error('DB binding missing')
    return c.text('Internal error: DB not configured', 500)
  }

  if (!env.BOT_TOKEN) {
    console.error('BOT_TOKEN missing')
    return c.text('Internal error: BOT_TOKEN not configured', 500)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.text('Bad Request: invalid JSON', 400)
  }

  const update = body as {
    message?: { message_id: number; text?: string; chat: { id: number } }
    edited_message?: { message_id: number; text?: string; chat: { id: number } }
  }

  const msg = update.message ?? update.edited_message
  if (!msg || typeof msg.text !== 'string') {
    return c.text('ok', 200)
  }

  const chatId = msg.chat.id
  const mensajeId = msg.message_id
  const text = msg.text

  // 2. Allowlist
  if (env.ALLOWED_CHAT_ID && env.ALLOWED_CHAT_ID !== '') {
    const allowed = Number(env.ALLOWED_CHAT_ID)
    if (Number.isFinite(allowed) && chatId !== allowed) {
      console.warn(`chat ${chatId} not allowed (allowed=${allowed})`)
      // Return 200 so Telegram doesn't retry, optionally notify
      await sendMessage(env, chatId, 'No autorizado')
      return c.text('ok', 200)
    }
  }

  const db = createDb(env.DB)

  const routed = await routeCommand({
    text,
    mensaje_tg_id: mensajeId,
    chat_tg_id: chatId,
    db,
  })

  let replyText: string

  if (routed.type === 'save') {
    const r = routed.result
    if (r.ok) {
      replyText = formatSaveSuccess(r.monto, r.tags, r.descripcion)
    } else if (r.reason === 'validation') {
      replyText = `Error: ${r.error}\n\n${getHelpText()}`
    } else if (r.reason === 'duplicate') {
      replyText = 'Ya registrado'
    } else {
      replyText = `Error: ${r.error}`
    }
  } else if (routed.type === 'help' || routed.type === 'start') {
    replyText = routed.text
  } else {
    replyText = routed.text
  }

  const sent = await sendMessage(env, chatId, replyText)
  if (!sent.ok) {
    console.error('sendMessage failed', sent.error)
  }

  return c.text('ok', 200)
}
