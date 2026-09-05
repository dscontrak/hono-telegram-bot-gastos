import { handleSave } from './save.command'
import { getHelpText } from './help.command'
import { getStartText } from './start.command'
import type { Db } from '../db/kysely'

export type RouteResult =
  | { type: 'save'; result: Awaited<ReturnType<typeof handleSave>> }
  | { type: 'help'; text: string }
  | { type: 'start'; text: string }
  | { type: 'unknown'; text: string }

export async function routeCommand(opts: {
  text: string
  mensaje_tg_id: number
  chat_tg_id: number
  db: Db
}): Promise<RouteResult> {
  const normalized = opts.text.trim()

  if (normalized.startsWith('/save')) {
    const result = await handleSave({
      text: normalized,
      mensaje_tg_id: opts.mensaje_tg_id,
      chat_tg_id: opts.chat_tg_id,
      db: opts.db,
    })
    return { type: 'save', result }
  }

  if (normalized.startsWith('/help')) {
    return { type: 'help', text: getHelpText() }
  }

  if (normalized.startsWith('/start')) {
    return { type: 'start', text: getStartText() }
  }

  return { type: 'unknown', text: getHelpText() }
}
