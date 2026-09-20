import type { Db } from '../db/kysely'

export async function ensureEtiquetas(db: Db, tags: string[]): Promise<Map<string, number>> {
  const normalized = [...new Set(tags.map((t) => t.toUpperCase()))]
  const map = new Map<string, number>()
  for (const etiqueta of normalized) {
    await db.insertInto('my_etiquetas').values({ etiqueta }).onConflict((oc) => oc.column('etiqueta').doNothing()).execute()
    const row = await db.selectFrom('my_etiquetas').select('etiqueta_id').where('etiqueta', '=', etiqueta).executeTakeFirstOrThrow()
    map.set(etiqueta, row.etiqueta_id)
  }
  return map
}
