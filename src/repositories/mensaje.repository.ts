import type { Db } from '../db/kysely'

export async function findMensaje(db: Db, mensaje_tg_id: number, chat_tg_id: number) {
  return db
    .selectFrom('my_tg_mensajes')
    .selectAll()
    .where('mensaje_tg_id', '=', mensaje_tg_id)
    .where('chat_tg_id', '=', chat_tg_id)
    .executeTakeFirst()
}

export async function existsMensaje(db: Db, mensaje_tg_id: number, chat_tg_id: number) {
  const row = await findMensaje(db, mensaje_tg_id, chat_tg_id)
  return !!row
}
