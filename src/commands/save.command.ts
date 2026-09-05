import { parseSave, isParseSaveSuccess } from './save.parser'
import { saveGasto } from '../repositories/gasto.repository'
import type { Db } from '../db/kysely'

export type SaveCommandInput = {
  text: string
  mensaje_tg_id: number
  chat_tg_id: number
  db: Db
}

export type SaveCommandResult =
  | { ok: true; gasto_id: number; monto: number; tags: string[]; descripcion: string }
  | { ok: false; reason: 'validation'; error: string }
  | { ok: false; reason: 'duplicate'; error: string; existing_gasto_id?: number }
  | { ok: false; reason: 'error'; error: string }

export async function handleSave(input: SaveCommandInput): Promise<SaveCommandResult> {
  const parsed = parseSave(input.text)
  if (!isParseSaveSuccess(parsed)) {
    return { ok: false, reason: 'validation', error: parsed.error }
  }

  const result = await saveGasto(input.db, {
    monto: parsed.monto,
    descripcion: parsed.descripcion,
    tags: parsed.tags,
    mensaje_tg_id: input.mensaje_tg_id,
    chat_tg_id: input.chat_tg_id,
  })

  if (result.ok) {
    return { ok: true, gasto_id: result.gasto_id, monto: parsed.monto, tags: parsed.tags, descripcion: parsed.descripcion }
  }

  if (result.reason === 'duplicate') {
    return { ok: false, reason: 'duplicate', error: 'Ya registrado', existing_gasto_id: result.existing_gasto_id }
  }

  return { ok: false, reason: 'error', error: result.error }
}
