import type { Db } from '../db/kysely'

export type SaveGastoInput = {
  monto: number
  descripcion: string
  tags: string[] // already uppercased, deduped
  mensaje_tg_id: number
  chat_tg_id: number
}

export type SaveGastoResult =
  | { ok: true; gasto_id: number }
  | { ok: false; reason: 'duplicate'; existing_gasto_id?: number }
  | { ok: false; reason: 'error'; error: string }

export async function saveGasto(db: Db, input: SaveGastoInput): Promise<SaveGastoResult> {
  const { monto, descripcion, tags, mensaje_tg_id, chat_tg_id } = input

  try {
    // Cheap dedup check before transaction
    const existing = await db
      .selectFrom('mensajes')
      .select('gasto_id')
      .where('mensaje_tg_id', '=', mensaje_tg_id)
      .where('chat_tg_id', '=', chat_tg_id)
      .executeTakeFirst()

    if (existing) {
      return { ok: false, reason: 'duplicate', existing_gasto_id: existing.gasto_id }
    }

    // D1Dialect does not support Kysely transaction (throws). Use sequential inserts.
    const inserted = await db
      .insertInto('gastos')
      .values({ monto, descripcion })
      .returning('gasto_id')
      .executeTakeFirstOrThrow()

    const gasto_id = inserted.gasto_id as number

    const uniqueTags = [...new Set(tags.map((t) => t.toUpperCase()))].filter(Boolean)

    try {
      for (const etiqueta of uniqueTags) {
        await db
          .insertInto('etiquetas')
          .values({ etiqueta })
          .onConflict((oc) => oc.column('etiqueta').doNothing())
          .execute()

        const tagRow = await db
          .selectFrom('etiquetas')
          .select('etiqueta_id')
          .where('etiqueta', '=', etiqueta)
          .executeTakeFirstOrThrow()

        await db
          .insertInto('etiquetas_gastos')
          .values({ etiqueta_id: tagRow.etiqueta_id, gasto_id })
          .onConflict((oc) => oc.columns(['etiqueta_id', 'gasto_id']).doNothing())
          .execute()
      }

      await db
        .insertInto('mensajes')
        .values({ gasto_id, mensaje_tg_id, chat_tg_id })
        .execute()

      return { ok: true, gasto_id }
    } catch (e) {
      // If mensajes insert fails due to duplicate PK, cleanup orphan gasto
      const msg = e instanceof Error ? e.message : String(e)
      const isDup = msg.includes('UNIQUE constraint') || msg.includes('PRIMARY KEY') || msg.includes('duplicate')
      if (isDup) {
        try {
          await db.deleteFrom('etiquetas_gastos').where('gasto_id', '=', gasto_id).execute()
          await db.deleteFrom('gastos').where('gasto_id', '=', gasto_id).execute()
        } catch {}
      }
      throw e
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'DUPLICATE' || msg.includes('UNIQUE constraint') || msg.includes('PRIMARY KEY')) {
      // try to fetch existing id
      try {
        const existing = await db
          .selectFrom('mensajes')
          .select('gasto_id')
          .where('mensaje_tg_id', '=', mensaje_tg_id)
          .where('chat_tg_id', '=', chat_tg_id)
          .executeTakeFirst()
        if (existing) return { ok: false, reason: 'duplicate', existing_gasto_id: existing.gasto_id }
      } catch {}
      return { ok: false, reason: 'duplicate' }
    }
    return { ok: false, reason: 'error', error: msg }
  }
}
